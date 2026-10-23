import { addDays } from './dates'
import type { Day, Entry } from './types'

/** Consecutive days with something logged (or marked no-spend), ending today or yesterday. */
export function streak(entries: Entry[], noSpend: Day[], userId: string, on: Day) {
  const days = new Set<Day>([...entries.filter((e) => e.createdBy === userId && !e.repeatOf).map((e) => e.occurredOn), ...noSpend])
  const doneToday = days.has(on)
  let d = doneToday ? on : addDays(on, -1)
  let n = 0
  while (days.has(d)) {
    n++
    d = addDays(d, -1)
  }
  return { count: n, doneToday, days }
}
