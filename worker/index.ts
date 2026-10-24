// Serves the app's static build, plus /api/chat (the assistant's model calls, streamed from Gemini through
// worker/gemini.ts) and /api/models (which free models it may use).
// The model's API key lives here as a secret and never reaches the app. Each request first calls ai_use() with
// the person's Supabase token, which checks who they are and counts it against their daily allowance.
// The tools themselves run in the app (src/assistant/run.ts), on the data the person can already see.
import { systemPrompt, TOOLS, type ChatContext } from '../src/assistant/tools'
import { sseChunks, toGemini, translator, type OpenAiMsg } from './gemini'
import { freeModels, markBroken } from './models'

interface Env {
  ASSETS: { fetch(req: Request): Promise<Response> }
  /** Secret: a Gemini API key from a Google AI Studio project without billing, so only the free tier is used. */
  GEMINI_API_KEY?: string
  /** Comma-separated model ids to recommend first; empty recommends the newest Flash. */
  AI_PREFERRED?: string
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
}

interface Msg { role: 'user' | 'assistant' | 'tool'; content: string | null; tool_calls?: unknown[]; tool_call_id?: string }

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta'
const FIRST_WORDS_MS = 20_000
const REPLY_MS = 120_000
const MAX_BODY = 400_000
const MAX_MESSAGES = 120

const preferred = (env: Env) => (env.AI_PREFERRED ?? '').split(',').map((x) => x.trim()).filter(Boolean)

const fail = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), { status, headers: { 'content-type': 'application/json' } })

export default {
  async fetch(req: Request, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }): Promise<Response> {
    const url = new URL(req.url)
    if (url.pathname === '/api/chat') return req.method === 'POST' ? chat(req, env, ctx) : fail(405, 'method')
    if (url.pathname === '/api/models') {
      if (!env.GEMINI_API_KEY) return fail(503, 'not_configured')
      return Response.json(await freeModels(env.GEMINI_API_KEY, preferred(env)), { headers: { 'cache-control': 'no-store' } })
    }
    if (url.pathname.startsWith('/api/')) return fail(404, 'not_found')
    return env.ASSETS.fetch(req)
  },
}

async function chat(req: Request, env: Env, worker: { waitUntil(p: Promise<unknown>): void }): Promise<Response> {
  if (!env.GEMINI_API_KEY) return fail(503, 'not_configured')
  const token = req.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1]
  if (!token) return fail(401, 'signed_out')

  const raw = await req.text()
  if (raw.length > MAX_BODY) return fail(413, 'too_long')
  let body: { messages?: Msg[]; context?: ChatContext; model?: string }
  try {
    body = JSON.parse(raw)
  } catch {
    return fail(400, 'bad_json')
  }
  const { messages, context } = body
  if (!Array.isArray(messages) || !messages.length || messages.length > MAX_MESSAGES || !context?.space?.id) return fail(400, 'bad_request')
  // only the conversation itself; the system prompt and tools are set here
  const convo = messages
    .filter((m) => m && ['user', 'assistant', 'tool'].includes(m.role))
    .map(({ role, content, tool_calls, tool_call_id }) => ({ role, content, ...(tool_calls ? { tool_calls } : {}), ...(tool_call_id ? { tool_call_id } : {}) }))
  const ctx: ChatContext = {
    today: /^\d{4}-\d{2}-\d{2}$/.test(context.today) ? context.today : new Date().toISOString().slice(0, 10),
    locale: context.locale === 'ja' ? 'ja' : 'en',
    space: { id: String(context.space.id).slice(0, 64), name: String(context.space.name ?? '').slice(0, 60) },
  }

  const t0 = Date.now()
  console.log('chat start', convo.length, 'messages')
  // who is asking, and is there allowance left today
  const use = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/ai_use`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_ANON_KEY, authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: '{}',
  })
  if (!use.ok) {
    const text = await use.text()
    if (text.includes('ai daily limit')) return fail(429, 'daily_limit')
    if (use.status === 401 || use.status === 403 || text.includes('not signed in') || text.includes('JWT')) return fail(401, 'signed_out')
    console.error('ai_use failed', use.status, text)
    return fail(502, 'usage_check')
  }

  console.log('signed in', Date.now() - t0, 'ms')
  // the model picked in the app, if it is still a free one; otherwise the recommended one
  const { models, recommended } = await freeModels(env.GEMINI_API_KEY, preferred(env))
  // when the list cannot be had, Gemini's own alias for its newest Flash
  const model = models.some((m) => m.id === body.model) ? body.model! : (recommended ?? 'gemini-flash-latest')

  // The reply streams back at once: a keep-alive every few seconds while Gemini thinks, so a phone never drops a
  // quiet connection, then Gemini's chunks as the app's events. Errors from here on arrive as an error event.
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const out = writable.getWriter()
  const enc = new TextEncoder()
  const send = (s: string) => out.write(enc.encode(s)).catch(() => {})
  void send(': ok\n\n')
  const ping = setInterval(() => void send(': ping\n\n'), 5000)
  // the picked model first, then the others in the list's order; a model that is busy, refused or silent
  // before its first words hands over to the next one
  const order = [model, ...models.map((m) => m.id).filter((id) => id !== model)].slice(0, 3)
  const stream = async () => {
    let failed = 'model_unreachable'
    try {
      for (const m of order) {
        const r = await attempt(m)
        if (r === 'done') return
        failed = r
      }
      await send(`data: ${JSON.stringify({ error: { code: failed } })}\n\n`)
    } finally {
      clearInterval(ping)
      await out.close().catch(() => {})
    }
  }
  /** One model's try: 'done' once it has answered (or failed after starting), else the error code to try the next with. */
  const attempt = async (m: string): Promise<'done' | string> => {
    const started = Date.now()
    // until the first words arrive this is short, then the whole reply gets two minutes
    const ctl = new AbortController()
    let timer = setTimeout(() => ctl.abort(), FIRST_WORDS_MS)
    const call = (thinking: boolean) => fetch(`${GEMINI}/models/${encodeURIComponent(m)}:streamGenerateContent?alt=sse`, {
      method: 'POST', signal: ctl.signal,
      headers: { 'x-goog-api-key': env.GEMINI_API_KEY!, 'content-type': 'application/json' },
      body: JSON.stringify(toGemini(systemPrompt(ctx), convo as OpenAiMsg[], TOOLS, m, thinking)),
    })
    let spoke = false
    try {
      let res = await call(true)
      // a model that does not take the thinking settings gets the request without them
      if (res.status === 400) {
        console.error('model refused thinking settings', m, (await res.text()).slice(0, 400))
        res = await call(false)
      }
      console.log('model answered', m, res.status, Date.now() - started, 'ms')
      if (!res.ok || !res.body) {
        console.error('model failed', m, res.status, (await res.text()).slice(0, 600))
        if (res.status === 404) markBroken(m)
        const code = res.status === 429 || res.status === 503 ? 'model_busy' : `model_${res.status}`
        if ([404, 429, 500, 503].includes(res.status)) return code
        await send(`data: ${JSON.stringify({ error: { code } })}\n\n`)
        return 'done'
      }
      const translate = translator()
      for await (const chunk of sseChunks(res.body)) {
        const events = translate(chunk)
        if (!events) continue
        if (!spoke) {
          console.log('first words', m, Date.now() - started, 'ms')
          clearTimeout(timer)
          timer = setTimeout(() => ctl.abort(), REPLY_MS)
        }
        spoke = true
        await send(events)
      }
      await send('data: [DONE]\n\n')
      console.log('model done', m, Date.now() - started, 'ms')
      return 'done'
    } catch (e) {
      console.error('model stream failed', m, Date.now() - started, 'ms', String(e))
      if (!spoke) return ctl.signal.aborted ? 'model_timeout' : 'model_unreachable'
      await send(`data: ${JSON.stringify({ error: { code: ctl.signal.aborted ? 'model_timeout' : 'model_unreachable' } })}\n\n`)
      return 'done'
    } finally {
      clearTimeout(timer)
    }
  }
  worker.waitUntil(stream())
  return new Response(readable, { headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-store' } })
}
