// Serves the app's static build, plus /api/chat (the assistant's model calls) and /api/models (which free models
// it may use).
// The model's API key lives here as a secret and never reaches the app. Each request first calls ai_use() with
// the person's Supabase token, which checks who they are and counts it against their daily allowance.
// The tools themselves run in the app (src/assistant/run.ts), on the data the person can already see.
import { systemPrompt, TOOLS, type ChatContext } from '../src/assistant/tools'
import { freeModels } from './models'

interface Env {
  ASSETS: { fetch(req: Request): Promise<Response> }
  /** Secret: a Gemini API key from a Google AI Studio project without billing, so only the free tier is used. */
  GEMINI_API_KEY?: string
  AI_BASE_URL: string
  /** Comma-separated model ids to recommend first; empty recommends the newest Flash. */
  AI_PREFERRED?: string
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
}

interface Msg { role: 'user' | 'assistant' | 'tool'; content: string | null; tool_calls?: unknown[]; tool_call_id?: string }

const MAX_BODY = 400_000
const MAX_MESSAGES = 120

const preferred = (env: Env) => (env.AI_PREFERRED ?? '').split(',').map((x) => x.trim()).filter(Boolean)

const fail = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), { status, headers: { 'content-type': 'application/json' } })

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    if (url.pathname === '/api/chat') return req.method === 'POST' ? chat(req, env) : fail(405, 'method')
    if (url.pathname === '/api/models') {
      if (!env.GEMINI_API_KEY) return fail(503, 'not_configured')
      return Response.json(await freeModels(env.GEMINI_API_KEY, preferred(env)), { headers: { 'cache-control': 'no-store' } })
    }
    if (url.pathname.startsWith('/api/')) return fail(404, 'not_found')
    return env.ASSETS.fetch(req)
  },
}

async function chat(req: Request, env: Env): Promise<Response> {
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

  // the model picked in the app, if it is still a free one; otherwise the recommended one
  const { models, recommended } = await freeModels(env.GEMINI_API_KEY, preferred(env))
  // when the list cannot be had, Gemini's own alias for its newest Flash
  const model = models.some((m) => m.id === body.model) ? body.model! : (recommended ?? 'gemini-flash-latest')

  // a limit on waiting for the model to start answering; the answer itself then streams through
  const started = Date.now()
  const wait = new AbortController()
  const timer = setTimeout(() => wait.abort(), 60_000)
  const upstream = await fetch(`${env.AI_BASE_URL}/chat/completions`, {
    method: 'POST', signal: wait.signal,
    headers: { authorization: `Bearer ${env.GEMINI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt(ctx) }, ...convo],
      tools: TOOLS,
      tool_choice: 'auto',
      stream: true,
      max_tokens: 2000,
    }),
  }).catch((e: unknown) => e as Error).finally(() => clearTimeout(timer))
  if (upstream instanceof Error) {
    console.error('model unreachable', model, Date.now() - started, 'ms', String(upstream))
    return fail(504, wait.signal.aborted ? 'model_timeout' : 'model_unreachable')
  }
  console.log('model answered', model, upstream.status, Date.now() - started, 'ms')
  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text()
    console.error('model failed', model, upstream.status, text.slice(0, 800))
    return fail(upstream.status === 429 ? 429 : 502, upstream.status === 429 ? 'model_busy' : `model_${upstream.status}`)
  }
  return new Response(upstream.body, { headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-store' } })
}
