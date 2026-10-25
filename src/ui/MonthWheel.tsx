import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n'
import { IconChevron } from './icons'

const ROW = 40

/** One wheel: the row in the middle band is the choice; it settles on a row after a fling, a tap scrolls a row there. */
function Wheel({ items, index, onPick, label }: { items: string[]; index: number; onPick(i: number): void; label: string }) {
  const el = useRef<HTMLDivElement>(null)
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [shown, setShown] = useState(index)

  useLayoutEffect(() => {
    if (el.current) el.current.scrollTop = index * ROW
    setShown(index)
  }, [index])
  useEffect(() => () => clearTimeout(settle.current), [])

  const onScroll = () => {
    const i = Math.max(0, Math.min(items.length - 1, Math.round(el.current!.scrollTop / ROW)))
    setShown(i)
    clearTimeout(settle.current)
    settle.current = setTimeout(() => i !== index && onPick(i), 140)
  }
  return (
    <div className="wheel" ref={el} role="listbox" aria-label={label} onScroll={onScroll}>
      {items.map((x, i) => (
        <button key={x} type="button" role="option" aria-selected={i === shown}
          style={{ '--d': Math.min(3, Math.abs(i - shown)) } as CSSProperties}
          onClick={() => el.current?.scrollTo({ top: i * ROW, behavior: 'smooth' })}>{x}</button>
      ))}
    </div>
  )
}

/** The month shown, as one button; it opens year and month wheels underneath. */
export function MonthWheel({ value, years, onChange }: { value: string; years: number[]; onChange(month: string): void }) {
  const { t, locale, month: monthName } = useI18n()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<CSSProperties>({})
  const trigger = useRef<HTMLButtonElement>(null)
  const [y, m] = value.split('-').map(Number)
  const label = locale === 'ja' ? `${y}年${m}月` : `${monthName(m)} ${y}`

  useLayoutEffect(() => {
    if (!open || !trigger.current) return
    const r = trigger.current.getBoundingClientRect()
    setPos({ top: r.bottom + 6, left: Math.max(8, r.left), width: Math.min(window.innerWidth - 16, Math.max(r.width, 260)) })
  }, [open])

  const set = (yy: number, mm: number) => onChange(`${yy}-${String(mm).padStart(2, '0')}`)
  const host = typeof document !== 'undefined' ? document.querySelector('.app') ?? document.body : null
  return (
    <>
      <button ref={trigger} type="button" className="sel month-btn" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="sel-v">{label}</span>
        <IconChevron />
      </button>
      {open && host && createPortal(
        <>
          <div className="sel-scrim" onClick={() => setOpen(false)} />
          <div className="wheels" role="dialog" aria-label={t('pickMonth')} style={pos}>
            <div className="wheel-band" aria-hidden="true" />
            <Wheel label={t('year')} items={years.map((yy) => (locale === 'ja' ? `${yy}年` : String(yy)))} index={Math.max(0, years.indexOf(y))}
              onPick={(i) => set(years[i], m)} />
            <Wheel label={t('monthL')} items={Array.from({ length: 12 }, (_, i) => monthName(i + 1))} index={m - 1}
              onPick={(i) => set(y, i + 1)} />
          </div>
        </>,
        host,
      )}
    </>
  )
}
