// Serves the app's static build, plus /api/chat (the assistant's model calls, streamed from OpenCode Go or from
// Gemini through worker/gemini.ts) and /api/models (which models it may use, worker/models.ts).
// The model's API key lives here as a secret and never reaches the app. Each request first calls ai_use() with
// the person's Supabase token, which checks who they are and counts it against their daily allowance.
// The tools themselves run in the app (src/assistant/run.ts), on the data the person can already see.
import { systemPrompt, TOOLS, type ChatContext } from '../src/assistant/tools'
import { sseChunks, sseLines, toGemini, translator, type OpenAiMsg, type UserPart } from './gemini'
import { allModels, bareId, GO_URL, markBroken, providerOf, type Keys } from './models'

interface Env {
  ASSETS: { fetch(req: Request): Promise<Response> }
  /** Secret: an OpenCode Go API key (the user's subscription). */
  OPENCODE_API_KEY?: string
  /** Secret: a Gemini API key from a Google AI Studio project without billing, so only the free tier is used. */
  GEMINI_API_KEY?: string
  /** Comma-separated Gemini models to offer. */
  GEMINI_MODELS?: string
  /** Comma-separated model ids (`go:…`, `gemini:…`) to recommend first, in order. */
  AI_PREFERRED?: string
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
}

interface Msg { role: 'user' | 'assistant' | 'tool'; content: string | null | UserPart[]; tool_calls?: unknown[]; tool_call_id?: string }

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta'
const FIRST_WORDS_MS = 20_000
const REPLY_MS = 120_000
/** Room for a photo or two (the app sends them at most 1600 px as JPEG). */
const MAX_BODY = 3_000_000
const MAX_MESSAGES = 120

const list = (s?: string) => (s ?? '').split(',').map((x) => x.trim()).filter(Boolean)
const keys = (env: Env): Keys => ({ go: env.OPENCODE_API_KEY, gemini: env.GEMINI_API_KEY, geminiModels: list(env.GEMINI_MODELS), preferred: list(env.AI_PREFERRED) })
const configured = (env: Env) => !!(env.OPENCODE_API_KEY || env.GEMINI_API_KEY)

const fail = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), { status, headers: { 'content-type': 'application/json' } })

export default {
  async fetch(req: Request, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }): Promise<Response> {
    const url = new URL(req.url)
    if (url.pathname === '/api/chat') return req.method === 'POST' ? chat(req, env, ctx) : fail(405, 'method')
    if (url.pathname === '/api/models') {
      if (!configured(env)) return fail(503, 'not_configured')
      return Response.json(await allModels(keys(env)), { headers: { 'cache-control': 'no-store' } })
    }
    if (url.pathname.startsWith('/api/')) return fail(404, 'not_found')
    return env.ASSETS.fetch(req)
  },
}

async function chat(req: Request, env: Env, worker: { waitUntil(p: Promise<unknown>): void }): Promise<Response> {
  if (!configured(env)) return fail(503, 'not_configured')
  const token = req.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1]
  if (!token) return fail(401, 'signed_out')

  const raw = await req.text()
  if (raw.length > MAX_BODY) return fail(413, 'too_long')
  let body: { messages?: Msg[]; context?: ChatContext; model?: string; session?: string }
  try {
    body = JSON.parse(raw)
  } catch {
    return fail(400, 'bad_json')
  }
  const { messages, context } = body
  if (!Array.isArray(messages) || !messages.length || messages.length > MAX_MESSAGES || !context?.space?.id) return fail(400, 'bad_request')
  // parts are text, or a photo as a data URL; nothing that makes the provider fetch a link
  const goodPart = (p: UserPart) => p?.type === 'text' ? typeof p.text === 'string'
    : p?.type === 'image_url' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p.image_url?.url ?? '')
  if (messages.some((m) => Array.isArray(m?.content) && (m.role !== 'user' || !m.content.every(goodPart)))) return fail(400, 'bad_request')
  const hasPhoto = messages.some((m) => Array.isArray(m.content) && m.content.some((p) => p.type === 'image_url'))
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
  // the model picked in the app, if it is still offered; otherwise the recommended one
  const { models, recommended } = await allModels(keys(env))
  const model = models.some((m) => m.id === body.model) ? body.model! : recommended
  if (!model) return fail(503, 'no_model')
  // OpenCode Go routes and caches by a stable id per conversation, which it requires
  const session = typeof body.session === 'string' && /^[\w-]{8,64}$/.test(body.session) ? body.session : crypto.randomUUID()

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
  // with a photo, only models that can read photos
  const able = models.filter((m) => !hasPhoto || m.vision).map((m) => m.id)
  if (!able.length) return fail(422, 'no_photo_model')
  const order = [...(able.includes(model) ? [model] : []), ...able.filter((id) => id !== model)].slice(0, 3)
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
    const provider = providerOf(m)
    const id = bareId(m)
    // until the first words arrive this is short, then the whole reply gets two minutes
    const ctl = new AbortController()
    let timer = setTimeout(() => ctl.abort(), FIRST_WORDS_MS)
    const call = (thinking: boolean) => provider === 'go'
      ? fetch(`${GO_URL}/chat/completions`, {
        method: 'POST', signal: ctl.signal,
        headers: {
          authorization: `Bearer ${env.OPENCODE_API_KEY}`, 'content-type': 'application/json',
          'x-opencode-session': session, 'user-agent': 'lifey-assistant/0.1',
        },
        body: JSON.stringify({
          model: id, stream: true, max_tokens: 4000, tools: TOOLS, tool_choice: 'auto',
          // Gemini's signatures mean nothing to other models
          messages: [{ role: 'system', content: systemPrompt(ctx) }, ...(convo as OpenAiMsg[]).map(({ tool_calls, ...msg }) =>
            tool_calls ? { ...msg, tool_calls: tool_calls.map(({ extra_content: _x, ...tc }) => ({ ...tc, type: 'function' })) } : msg)],
        }),
      })
      : fetch(`${GEMINI}/models/${encodeURIComponent(id)}:streamGenerateContent?alt=sse`, {
        method: 'POST', signal: ctl.signal,
        headers: { 'x-goog-api-key': env.GEMINI_API_KEY!, 'content-type': 'application/json' },
        body: JSON.stringify(toGemini(systemPrompt(ctx), convo as OpenAiMsg[], TOOLS, id, thinking)),
      })
    let spoke = false
    const spoken = async (events: string) => {
      if (!spoke) {
        console.log('first words', m, Date.now() - started, 'ms')
        clearTimeout(timer)
        timer = setTimeout(() => ctl.abort(), REPLY_MS)
      }
      // tell the app when another model than the picked one answers
      if (!spoke && m !== model) await send(`data: ${JSON.stringify({ answered_by: m })}\n\n`)
      spoke = true
      await send(events)
    }
    try {
      let res = await call(true)
      // a Gemini model that does not take the thinking settings gets the request without them
      if (res.status === 400 && provider === 'gemini') {
        console.error('model refused thinking settings', m, (await res.text()).slice(0, 400))
        res = await call(false)
      }
      console.log('model answered', m, res.status, Date.now() - started, 'ms')
      if (!res.ok || !res.body) {
        console.error('model failed', m, res.status, (await res.text()).slice(0, 600))
        if (res.status === 404) markBroken(m)
        const code = res.status === 429 || res.status === 503 ? 'model_busy' : `model_${res.status}`
        if ([404, 429, 500, 502, 503].includes(res.status)) return code
        await send(`data: ${JSON.stringify({ error: { code } })}\n\n`)
        return 'done'
      }
      if (provider === 'go') {
        // already the app's format: pass each event on, ending with our own [DONE]
        for await (const data of sseLines(res.body)) if (data !== '[DONE]') await spoken(`data: ${data}\n\n`)
      } else {
        const translate = translator()
        for await (const chunk of sseChunks(res.body)) {
          // an error before any words (Gemini sends "overloaded" this way too) hands over like a refused request
          if (chunk.error && !spoke) {
            console.error('model failed in stream', m, JSON.stringify(chunk.error).slice(0, 400))
            return chunk.error.code === 429 || chunk.error.code === 503 ? 'model_busy' : `model_${chunk.error.code ?? 'error'}`
          }
          const events = translate(chunk)
          if (events) await spoken(events)
        }
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
