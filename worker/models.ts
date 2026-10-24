// Which Gemini models the assistant may use, checked live against the key's model list. Only Flash models are
// offered: they are in Gemini's free tier and can call tools. The key should come from a Google AI Studio project
// without billing, so nothing is ever charged.

export interface Model { id: string; name: string; context?: number }
export interface ModelList { models: Model[]; recommended: string | null }

/** One entry of Gemini's own /models list. */
export interface GeminiModel { name: string; displayName?: string; supportedGenerationMethods?: string[]; inputTokenLimit?: number }

const LIST_URL = 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000'
const KEEP_MS = 3600_000
/** Flash models that do something other than chat. */
const NOT_CHAT = /image|tts|audio|live|embedding|vision|thinking-exp|robotics|computer-use|native/

const version = (id: string) => parseFloat(id.match(/^gemini-(\d+(?:\.\d+)?)/)?.[1] ?? '0')

/** The free chat models, recommended first. Pure, for tests. */
export function pickModels(list: GeminiModel[], preferred: string[] = []): ModelList {
  const models = list
    .map((m) => ({ ...m, id: m.name.replace(/^models\//, '') }))
    .filter((m) => /^gemini-[\d.]+-flash/.test(m.id) && !NOT_CHAT.test(m.id) && (m.supportedGenerationMethods ?? ['generateContent']).includes('generateContent'))
  const rank = (id: string) => (preferred.includes(id) ? preferred.indexOf(id) : preferred.length)
  // preferred first, then the newest, full Flash before Lite, released before preview
  models.sort((a, b) => rank(a.id) - rank(b.id) || version(b.id) - version(a.id) || Number(a.id.includes('lite')) - Number(b.id.includes('lite'))
    || Number(a.id.includes('preview')) - Number(b.id.includes('preview')) || a.id.localeCompare(b.id))
  return {
    models: models.map((m) => ({ id: m.id, name: m.displayName ?? m.id, ...(m.inputTokenLimit ? { context: m.inputTokenLimit } : {}) })),
    recommended: models[0]?.id ?? null,
  }
}

/** Models Gemini refused (404) while listing them anyway, hidden for an hour. */
const broken = new Map<string, number>()
export const markBroken = (id: string) => void broken.set(id, Date.now() + KEEP_MS)
const usable = (list: ModelList): ModelList => {
  const models = list.models.filter((m) => (broken.get(m.id) ?? 0) < Date.now())
  return { models, recommended: models.some((m) => m.id === list.recommended) ? list.recommended : (models[0]?.id ?? null) }
}

/** The list, kept in memory for an hour (the Cache API does nothing on workers.dev). */
let kept: { at: number; list: ModelList } | null = null

export async function freeModels(key: string, preferred: string[]): Promise<ModelList> {
  if (kept && Date.now() - kept.at < KEEP_MS) return usable(kept.list)
  let models: GeminiModel[] = []
  try {
    const r = await fetch(LIST_URL, { headers: { 'x-goog-api-key': key } })
    if (r.ok) models = ((await r.json()) as { models?: GeminiModel[] }).models ?? []
    else console.error('model list failed', r.status, (await r.text()).slice(0, 300))
  } catch (e) {
    console.error('model list failed', e)
  }
  const list = pickModels(models, preferred)
  // keep only a real answer, so a hiccup is retried on the next request
  if (list.models.length) kept = { at: Date.now(), list }
  return usable(list)
}
