// Which models the assistant may use: OpenCode Zen's free models that can call tools, checked live.
// Zen's own /models says what is offered now; models.dev (OpenCode's model catalogue) says which are free and
// which can call tools. Paid models are never offered: they would bill the key's balance for everyone.

export interface Model { id: string; name: string; context?: number }
export interface ModelList { models: Model[]; recommended: string | null }

interface Catalogue {
  name?: string
  tool_call?: boolean
  reasoning?: boolean
  cost?: { input?: number; output?: number }
  limit?: { context?: number }
  status?: string
  /** Models that need another request format than chat/completions name their own SDK package. */
  provider?: { npm?: string }
}

const CATALOGUE = 'https://models.dev/api.json'
const KEEP_MS = 3600_000
/** Before the catalogue answers: free model ids look like this. */
const looksFree = (id: string) => /-free$/.test(id) || id === 'big-pickle'

/** The free, tool-calling models from both lists, best first. Pure, for tests. */
export function pickModels(live: string[] | null, catalogue: Record<string, Catalogue> | null): ModelList {
  const ids = live ?? Object.keys(catalogue ?? {})
  const models = ids
    .map((id) => ({ id, c: catalogue?.[id] }))
    .filter(({ id, c }) => {
      if (!c) return looksFree(id)
      const free = c.cost ? !c.cost.input && !c.cost.output : looksFree(id)
      const chat = !c.provider?.npm || c.provider.npm === '@ai-sdk/openai-compatible'
      return free && c.tool_call !== false && chat && c.status !== 'deprecated'
    })
    // recommended first: can reason, then the most context
    .sort((a, b) => Number(!!b.c?.reasoning) - Number(!!a.c?.reasoning) || (b.c?.limit?.context ?? 0) - (a.c?.limit?.context ?? 0) || a.id.localeCompare(b.id))
    .map(({ id, c }) => ({ id, name: c?.name ?? id, ...(c?.limit?.context ? { context: c.limit.context } : {}) }))
  return { models, recommended: models[0]?.id ?? null }
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const r = await fetch(url, init)
    return r.ok ? ((await r.json()) as T) : null
  } catch {
    return null
  }
}

/** The list, kept in memory for an hour (the Cache API does nothing on workers.dev). */
let kept: { at: number; list: ModelList } | null = null

export async function freeModels(baseUrl: string, key: string): Promise<ModelList> {
  if (kept && Date.now() - kept.at < KEEP_MS) return kept.list
  const [live, cat] = await Promise.all([
    getJson<{ data?: { id: string }[] }>(`${baseUrl}/models`, { headers: { authorization: `Bearer ${key}` } }),
    getJson<Record<string, { models?: Record<string, Catalogue> }>>(CATALOGUE),
  ])
  const list = pickModels(live?.data?.map((m) => m.id) ?? null, cat?.opencode?.models ?? null)
  // keep only a complete answer, so a hiccup is retried on the next request
  if (live && cat && list.models.length) kept = { at: Date.now(), list }
  return list
}
