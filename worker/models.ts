// Which models the assistant may use. Ids carry their provider: `go:<id>` for OpenCode Go (the user's
// subscription; its live list, keeping those that speak chat/completions) and `gemini:<id>` for Google Gemini's
// free tier (only GEMINI_MODELS, since newer Flash models were overloaded).

export type Provider = 'go' | 'gemini'
export interface Model { id: string; name: string; provider: Provider }
export interface ModelList { models: Model[]; recommended: string | null }

/** models.dev's entry for a model (the catalogue OpenCode uses). */
interface Catalogue { name?: string; tool_call?: boolean; status?: string; provider?: { npm?: string } }

const GO_URL = 'https://opencode.ai/zen/go/v1'
const CATALOGUE = 'https://models.dev/api.json'
const KEEP_MS = 3600_000
/** Go models without a catalogue entry that need another request format (Claude: messages; GPT, Grok: responses). */
const OTHER_FORMAT = /^(claude|gpt|grok)/

export const providerOf = (id: string): Provider | null => (id.startsWith('go:') ? 'go' : id.startsWith('gemini:') ? 'gemini' : null)
export const bareId = (id: string) => id.slice(id.indexOf(':') + 1)

/** Go's models that take chat/completions and can call tools. Pure, for tests. */
export function goModels(live: string[], catalogue: Record<string, Catalogue> | null): Model[] {
  return live
    .filter((id) => {
      const c = catalogue?.[id]
      if (!c) return !OTHER_FORMAT.test(id)
      const chat = !c.provider?.npm || c.provider.npm === '@ai-sdk/openai-compatible'
      return chat && c.tool_call !== false && c.status !== 'deprecated'
    })
    .map((id) => ({ id: `go:${id}`, name: catalogue?.[id]?.name ?? id, provider: 'go' as const }))
}

const GEMINI_NAMES: Record<string, string> = { 'gemini-3.6-flash': 'Gemini 3.6 Flash' }

/** Both lists together, the preferred ones first; the first is recommended. Pure, for tests. */
export function pickModels(go: Model[], gemini: string[], preferred: string[] = []): ModelList {
  const all = [...go, ...gemini.map((id) => ({ id: `gemini:${id}`, name: GEMINI_NAMES[id] ?? id, provider: 'gemini' as const }))]
  const rank = (id: string) => (preferred.includes(id) ? preferred.indexOf(id) : preferred.length)
  const models = all.map((m, i) => ({ m, i })).sort((a, b) => rank(a.m.id) - rank(b.m.id) || a.i - b.i).map(({ m }) => m)
  return { models, recommended: models[0]?.id ?? null }
}

async function getJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const r = await fetch(url, init)
    if (r.ok) return (await r.json()) as T
    console.error('list failed', url, r.status, (await r.text()).slice(0, 300))
  } catch (e) {
    console.error('list failed', url, String(e))
  }
  return null
}

/** Models that failed as if they did not exist (404), hidden for an hour. */
const broken = new Map<string, number>()
export const markBroken = (id: string) => void broken.set(id, Date.now() + KEEP_MS)
const usable = (list: ModelList): ModelList => {
  const models = list.models.filter((m) => (broken.get(m.id) ?? 0) < Date.now())
  return { models, recommended: models.some((m) => m.id === list.recommended) ? list.recommended : (models[0]?.id ?? null) }
}

/** Go's list, kept in memory for an hour (the Cache API does nothing on workers.dev). */
let keptGo: { at: number; models: Model[] } | null = null

export interface Keys { go?: string; gemini?: string; geminiModels: string[]; preferred: string[] }

export async function allModels(k: Keys): Promise<ModelList> {
  let go: Model[] = []
  if (k.go) {
    if (keptGo && Date.now() - keptGo.at < KEEP_MS) go = keptGo.models
    else {
      const [live, cat] = await Promise.all([
        getJson<{ data?: { id: string }[] }>(`${GO_URL}/models`, { headers: { authorization: `Bearer ${k.go}` } }),
        getJson<Record<string, { models?: Record<string, Catalogue> }>>(CATALOGUE),
      ])
      go = goModels(live?.data?.map((m) => m.id) ?? [], cat?.['opencode-go']?.models ?? null)
      // keep only a complete answer, so a hiccup is retried on the next request
      if (live && cat && go.length) keptGo = { at: Date.now(), models: go }
    }
  }
  return usable(pickModels(go, k.gemini ? k.geminiModels : [], k.preferred))
}

export { GO_URL }
