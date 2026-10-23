import { addDays, addMonths, parts } from './dates'
import type { Day, Entry, NewEntry } from './types'

/** Occurrence n (0 = the template's own date) of a repeating entry. */
export function occurrence(template: Pick<Entry, 'occurredOn' | 'repeat'>, n: number): Day {
  const start = template.occurredOn
  switch (template.repeat) {
    case 'weekly':
      return addDays(start, 7 * n)
    case 'biweekly':
      return addDays(start, 14 * n)
    case 'monthly':
      return addMonths(start, n, parts(start)[2])
    case 'yearly':
      return addMonths(start, 12 * n, parts(start)[2])
    default:
      return start
  }
}

export const isTemplate = (e: Entry) => e.repeat !== 'none' && e.repeatOf === null

/** The next occurrence strictly after `after`, or null for one-off entries. */
export function nextOccurrence(template: Entry, after: Day): Day | null {
  if (!isTemplate(template)) return null
  for (let n = 1; n < 1000; n++) {
    const d = occurrence(template, n)
    if (d > after) return d
  }
  return null
}

/**
 * Entries that should exist by `upTo` but have not been posted yet.
 * Only the logger's own templates are posted, so two members never post the same occurrence.
 */
export function dueOccurrences(entries: Entry[], userId: string, upTo: Day, maxPerTemplate = 24): NewEntry[] {
  const posted = new Set(entries.filter((e) => e.repeatOf).map((e) => `${e.repeatOf}|${e.occurredOn}`))
  const out: NewEntry[] = []
  for (const t of entries) {
    if (!isTemplate(t) || t.createdBy !== userId) continue
    const due: Day[] = []
    for (let n = 1; ; n++) {
      const d = occurrence(t, n)
      if (d > upTo) break
      if (!posted.has(`${t.id}|${d}`)) due.push(d)
    }
    for (const d of due.slice(-maxPerTemplate)) {
      out.push({
        spaceId: t.spaceId,
        kind: t.kind,
        amount: t.amount,
        categoryId: t.categoryId,
        methodId: t.methodId,
        sourceId: t.sourceId,
        toSourceId: t.toSourceId,
        fee: t.fee,
        occurredOn: d,
        name: t.name,
        note: t.note,
        tags: t.tags,
        repeat: 'none',
        repeatOf: t.id,
      })
    }
  }
  return out
}
