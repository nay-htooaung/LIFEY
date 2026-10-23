import { categorySpent, creditOutstanding, flowsOf, sourceBalance } from './money'
import type { Day, Entry, Flow, NewEntry, Snapshot } from './types'

/** One change the assistant proposes. Nothing is saved until the person applies it. */
export type Change =
  | { key: string; op: 'add'; after: NewEntry }
  | { key: string; op: 'edit'; before: Entry; after: NewEntry }
  | { key: string; op: 'delete'; before: Entry }

const asEntry = (e: NewEntry, id: string, createdBy: string): Entry => ({ ...e, id, createdBy })

/** Entries as they would be after the changes; added ones get a placeholder id. */
export function entriesAfter(entries: Entry[], changes: Change[], me: string): Entry[] {
  const out = entries.slice()
  for (const c of changes) {
    if (c.op === 'add') out.push(asEntry(c.after, `new:${c.key}`, me))
    else {
      const i = out.findIndex((e) => e.id === c.before.id)
      if (i < 0) continue
      if (c.op === 'edit') out[i] = asEntry(c.after, c.before.id, c.before.createdBy)
      else out.splice(i, 1)
    }
  }
  return out
}

const sameFlow = (a: Flow, b: Flow) =>
  a.methodId === b.methodId && a.sourceId === b.sourceId && a.kind === b.kind && a.amount === b.amount && a.occurredOn === b.occurredOn

/**
 * Flows after the changes. Only the changed entries' own flows are swapped, so flows from entries I cannot see
 * (another member paying from a shared account) stay as they are.
 */
export function flowsAfter(flows: Flow[], changes: Change[]): Flow[] {
  const out = flows.slice()
  for (const c of changes) {
    if (c.op !== 'add') {
      for (const f of flowsOf([c.before])) {
        const i = out.findIndex((x) => sameFlow(x, f))
        if (i >= 0) out.splice(i, 1)
      }
    }
    if (c.op !== 'delete') out.push(...flowsOf([asEntry(c.after, '', '')]))
  }
  return out
}

/** A number the changes move: a source's balance, what a card owes, or a category's spending this month. */
export interface Impact {
  kind: 'source' | 'card' | 'category'
  id: string
  before: number
  after: number
}

/** Every balance, card and budget the changes move today, before and after. Unchanged ones are left out. */
export function changeImpact(s: Snapshot, changes: Change[], on: Day): Impact[] {
  const touched = changes.flatMap((c) => [...(c.op === 'add' ? [] : [c.before]), ...(c.op === 'delete' ? [] : [c.after])])
  const methodIds = new Set(touched.map((e) => e.methodId).filter((x): x is string => !!x))
  const sourceIds = new Set(touched.flatMap((e) => [e.sourceId, e.toSourceId]).filter((x): x is string => !!x))
  for (const m of s.methods) if (methodIds.has(m.id) && m.kind !== 'credit') sourceIds.add(m.sourceId)
  const catIds = new Set(touched.map((e) => e.categoryId).filter((x): x is string => !!x))

  const flows = flowsAfter(s.flows, changes)
  const entries = entriesAfter(s.entries, changes, s.me.id)
  const out: Impact[] = []
  for (const src of s.sources.filter((x) => sourceIds.has(x.id))) {
    out.push({ kind: 'source', id: src.id, before: sourceBalance(src, s.methods, s.flows, on), after: sourceBalance(src, s.methods, flows, on) })
  }
  for (const m of s.methods.filter((x) => methodIds.has(x.id) && x.kind === 'credit')) {
    out.push({ kind: 'card', id: m.id, before: creditOutstanding(m, s.flows, on), after: creditOutstanding(m, flows, on) })
  }
  for (const c of s.categories.filter((x) => catIds.has(x.id))) {
    out.push({ kind: 'category', id: c.id, before: categorySpent(s.entries, c, on), after: categorySpent(entries, c, on) })
  }
  return out.filter((x) => x.before !== x.after)
}
