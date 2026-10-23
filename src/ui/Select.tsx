import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconChevron } from './icons'

export interface Option {
  value: string
  label: string
  /** Shown before the label: a colour dot, a lock. */
  icon?: ReactNode
  /** Small muted text after the label, e.g. the space a card belongs to. */
  hint?: string
}

interface Props {
  id?: string
  value: string
  options: Option[]
  onChange(value: string): void
  disabled?: boolean
  placeholder?: string
  /** Adds a last row that creates something new instead of choosing ("+ New category"). */
  onNew?: () => void
  newLabel?: string
}

/** The app's dropdown. Replaces native <select> so it matches the theme on every platform. */
export function Select({ id, value, options, onChange, disabled, placeholder, onNew, newLabel }: Props) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<CSSProperties>({})
  const trigger = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const current = options.find((o) => o.value === value)

  // Place the list under the trigger, or above it when there is more room there.
  const place = useCallback(() => {
    if (!trigger.current) return
    const r = trigger.current.getBoundingClientRect()
    const below = window.innerHeight - r.bottom - 12
    const above = r.top - 12
    const rows = options.length + (onNew ? 1 : 0)
    const want = Math.min(rows * 46 + 12, 320)
    const up = below < want && above > below
    const width = Math.max(r.width, 200)
    setPos({
      left: Math.min(Math.max(8, r.left), window.innerWidth - width - 8),
      width,
      maxHeight: Math.min(want, up ? above : below),
      ...(up ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
    })
  }, [options.length, onNew])
  useLayoutEffect(() => {
    if (open) place()
  }, [open, place])

  useEffect(() => {
    if (!open) return
    // after the list has its size and position: show and focus the current choice
    const raf = requestAnimationFrame(() => {
      const l = list.current
      const selected = l?.querySelector<HTMLElement>('[aria-selected="true"]')
      // scroll only the list itself (scrollIntoView would also move the page behind it)
      if (l && selected) l.scrollTop = selected.offsetTop - (l.clientHeight - selected.offsetHeight) / 2
      ;(selected ?? list.current?.querySelector<HTMLElement>('[role="option"]'))?.focus({ preventScroll: true })
    })
    // When the page underneath scrolls (also when the browser brings the field into view), the list follows
    // its trigger; once the trigger is off screen it closes.
    const follow = (e: Event) => {
      if (e.type === 'scroll' && list.current?.contains(e.target as Node)) return
      const r = trigger.current?.getBoundingClientRect()
      if (!r || r.bottom < 0 || r.top > window.innerHeight) return setOpen(false)
      place()
    }
    window.addEventListener('scroll', follow, true)
    window.addEventListener('resize', follow)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', follow, true)
      window.removeEventListener('resize', follow)
    }
  }, [open, place])

  const pick = (v: string) => {
    setOpen(false)
    trigger.current?.focus()
    if (v !== value) onChange(v)
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      setOpen(false)
      trigger.current?.focus()
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const items = [...(list.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])]
      const i = items.indexOf(document.activeElement as HTMLElement)
      items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus()
    }
  }

  // Rendered into the app frame so it is not clipped by a scrolling sheet; it keeps the app's theme tokens.
  const host = typeof document !== 'undefined' ? document.querySelector('.app') ?? document.body : null

  return (
    <>
      <button
        id={id}
        ref={trigger}
        type="button"
        className="sel"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => e.key === 'ArrowDown' && (e.preventDefault(), setOpen(true))}
      >
        {current?.icon}
        <span className={'sel-v' + (current ? '' : ' muted')}>{current?.label ?? placeholder ?? ''}</span>
        {current?.hint && <span className="sel-h">{current.hint}</span>}
        <IconChevron />
      </button>
      {open && host && createPortal(
        <>
          {/* closes on click (not pointerdown), so the tap never reaches the trigger underneath and reopens it */}
          <div className="sel-scrim" onClick={() => setOpen(false)} />
          <div className="sel-list" role="listbox" ref={list} style={pos} onKeyDown={onKey}>
            {options.map((o) => (
              <button key={o.value} type="button" role="option" aria-selected={o.value === value} onClick={() => pick(o.value)}>
                {o.icon}
                <span className="sel-v">{o.label}</span>
                {o.hint && <span className="sel-h">{o.hint}</span>}
              </button>
            ))}
            {onNew && (
              <button type="button" role="option" aria-selected={false} className="sel-new" onClick={() => { setOpen(false); onNew() }}>
                <span className="sel-v">{newLabel}</span>
              </button>
            )}
          </div>
        </>,
        host,
      )}
    </>
  )
}

/** A colour dot for options (spaces, categories). */
export const Dot = ({ color, round }: { color: string; round?: boolean }) => (
  <span className="sel-dot" style={{ background: color, borderRadius: round ? '50%' : 3 }} />
)
