import type { Day } from './types'

const pad = (n: number) => String(n).padStart(2, '0')

export function toDay(d: Date): Day {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function today(): Day {
  return toDay(new Date())
}

export function parts(day: Day): [number, number, number] {
  const [y, m, d] = day.split('-').map(Number)
  return [y, m, d]
}

export function fromParts(y: number, m: number, d: number): Day {
  // normalise month overflow (m may be 0 or 13)
  const dt = new Date(y, m - 1, 1)
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(d)}`
}

export function daysInMonth(y: number, m: number): number {
  return new Date(y, m, 0).getDate()
}

export function addDays(day: Day, n: number): Day {
  const [y, m, d] = parts(day)
  return toDay(new Date(y, m - 1, d + n))
}

/** Same day-of-month n months later, clamped to the month's last day (Jan 31 + 1 month = Feb 28). */
export function addMonths(day: Day, n: number, anchorDay?: number): Day {
  const [y, m, d] = parts(day)
  const first = new Date(y, m - 1 + n, 1)
  const want = anchorDay ?? d
  const last = daysInMonth(first.getFullYear(), first.getMonth() + 1)
  return `${first.getFullYear()}-${pad(first.getMonth() + 1)}-${pad(Math.min(want, last))}`
}

/** The given day-of-month in month (y, m), clamped to the month's length. */
export function dayInMonth(y: number, m: number, dom: number): Day {
  const first = new Date(y, m - 1, 1)
  const yy = first.getFullYear()
  const mm = first.getMonth() + 1
  return `${yy}-${pad(mm)}-${pad(Math.min(dom, daysInMonth(yy, mm)))}`
}

export function monthKey(day: Day): string {
  return day.slice(0, 7)
}

export function daysBetween(a: Day, b: Day): number {
  const [y1, m1, d1] = parts(a)
  const [y2, m2, d2] = parts(b)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000)
}

export function weekday(day: Day): number {
  const [y, m, d] = parts(day)
  return new Date(y, m - 1, d).getDay()
}
