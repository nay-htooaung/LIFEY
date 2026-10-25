// What the entry form offers while typing: names and tags used before.
import type { Entry, EntryKind } from './types'

/** For matching only: full-width to half-width, lower case, katakana as hiragana. */
const fold = (s: string) =>
  s.normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))

/** Values by how often they were used, then how recently. */
function ranked(values: { v: string; on: string }[]) {
  const seen = new Map<string, { v: string; n: number; on: string }>()
  for (const { v, on } of values) {
    const x = seen.get(v)
    if (x) {
      x.n++
      if (on > x.on) x.on = on
    } else seen.set(v, { v, n: 1, on })
  }
  return [...seen.values()].sort((a, b) => b.n - a.n || b.on.localeCompare(a.on)).map((x) => x.v)
}

/** Earlier names in this space and kind containing what is typed (nothing until something is typed). */
export function nameSuggestions(entries: Entry[], spaceId: string, kind: EntryKind, typed: string, max = 6): string[] {
  const q = fold(typed.trim())
  if (!q) return []
  const names = ranked(entries.filter((e) => e.spaceId === spaceId && e.kind === kind && e.name).map((e) => ({ v: e.name, on: e.occurredOn })))
  // names starting with it first
  const hits = names.filter((n) => fold(n).includes(q) && n !== typed.trim())
  return [...hits.filter((n) => fold(n).startsWith(q)), ...hits.filter((n) => !fold(n).startsWith(q))].slice(0, max)
}

/** The tags typed so far, and the one being typed after the last comma. */
export const splitTags = (text: string) => {
  const all = text.split(/[,、，]/)
  return { done: all.slice(0, -1).map((s) => s.trim()).filter(Boolean), typing: all[all.length - 1].trim() }
}

/** Earlier tags in this space not already added, matching the one being typed. */
export function tagSuggestions(entries: Entry[], spaceId: string, text: string, max = 8): string[] {
  const { done, typing } = splitTags(text)
  const q = fold(typing)
  return ranked(entries.filter((e) => e.spaceId === spaceId).flatMap((e) => e.tags.map((v) => ({ v, on: e.occurredOn }))))
    .filter((t) => !done.includes(t) && t !== typing && fold(t).includes(q))
    .slice(0, max)
}

/** The text with the tag being typed replaced by `tag`, ready for the next. */
export const addTag = (text: string, tag: string) => [...splitTags(text).done, tag].join(', ') + ', '
