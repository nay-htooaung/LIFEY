import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties, type InputHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string
  onChange(value: string): void
  /** What to offer under the field while it is focused; nothing shows when empty. */
  suggestions: string[]
  onPick(suggestion: string): void
}

/**
 * A text field that offers earlier values in a list like Select's. Tapping one keeps the keyboard open,
 * so several tags can be added in a row.
 */
export function Suggest({ value, onChange, suggestions, onPick, ...input }: Props) {
  const [focused, setFocused] = useState(false)
  const [pos, setPos] = useState<CSSProperties>({})
  const field = useRef<HTMLInputElement>(null)
  const open = focused && suggestions.length > 0

  // under the field, or above it when the keyboard leaves more room there
  const place = useCallback(() => {
    const r = field.current?.getBoundingClientRect()
    if (!r) return
    const vv = window.visualViewport
    const bottom = vv ? vv.offsetTop + vv.height : window.innerHeight
    const below = bottom - r.bottom - 12
    const above = r.top - (vv?.offsetTop ?? 0) - 12
    const want = Math.min(suggestions.length * 44 + 12, 240)
    const up = below < want && above > below
    setPos({
      left: r.left, width: r.width, maxHeight: Math.min(want, up ? above : below),
      ...(up ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
    })
  }, [suggestions.length])

  useLayoutEffect(() => {
    if (!open) return
    place()
    // the keyboard opening and the sheet scrolling both move the field
    const vv = window.visualViewport
    vv?.addEventListener('resize', place)
    vv?.addEventListener('scroll', place)
    window.addEventListener('scroll', place, true)
    return () => {
      vv?.removeEventListener('resize', place)
      vv?.removeEventListener('scroll', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, place])

  const host = typeof document !== 'undefined' ? document.querySelector('.app') ?? document.body : null
  return (
    <>
      <input {...input} ref={field} value={value} autoComplete="off" role="combobox" aria-expanded={open} aria-autocomplete="list"
        onChange={(e) => onChange(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
      {open && host && createPortal(
        <div className="sel-list" role="listbox" style={pos}>
          {suggestions.map((s) => (
            // pointerdown would blur the field and close the keyboard; the click still picks
            <button key={s} type="button" role="option" aria-selected={false} onPointerDown={(e) => e.preventDefault()} onClick={() => onPick(s)}>
              <span className="sel-v">{s}</span>
            </button>
          ))}
        </div>,
        host,
      )}
    </>
  )
}
