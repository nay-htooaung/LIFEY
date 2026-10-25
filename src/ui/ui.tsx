import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { IconFlame } from './icons'
import { applyUpdate, useUpdateReady } from './update'
import { useI18n } from '../i18n'

interface Toast { msg: string; flame?: boolean; error?: boolean; id: number }
interface Sheet { node: ReactNode; tone?: string; key: number }
interface UI {
  /** Replaces whatever sheets are open with this one. */
  open(node: ReactNode, tone?: string): void
  /** Opens a sheet on top; closing it returns to the one below with its state intact. */
  push(node: ReactNode, tone?: string): void
  /** Closes the top sheet. */
  close(): void
  toast(msg: string, opts?: { flame?: boolean; error?: boolean }): void
}

const UICtx = createContext<UI | null>(null)
const StateCtx = createContext<{ sheets: Sheet[]; toast: Toast | null }>({ sheets: [], toast: null })

export const useUI = () => {
  const ui = useContext(UICtx)
  if (!ui) throw new Error('useUI outside UIProvider')
  return ui
}

let nextKey = 1

export function UIProvider({ children }: { children: ReactNode }) {
  const [sheets, setSheets] = useState<Sheet[]>([])
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Each open sheet owns one history entry, so Android's back button closes the top sheet instead of leaving
  // the app. `depth` is how many sheets are open; `entries` is how many history entries we have pushed.
  const depth = useRef(0)
  const entries = useRef(0)
  const syncing = useRef(false)
  const sync = useCallback(() => {
    if (syncing.current) return
    syncing.current = true
    // Next tick, so a close followed by an open (one sheet replacing another) reuses the entry.
    setTimeout(() => {
      syncing.current = false
      while (entries.current < depth.current) history.pushState({ ...history.state, sheet: ++entries.current }, '')
      if (entries.current > depth.current) {
        const n = entries.current - depth.current
        entries.current = depth.current
        history.go(-n)
      }
    })
  }, [])

  const open = useCallback((node: ReactNode, tone?: string) => {
    depth.current = 1
    setSheets([{ node, tone, key: nextKey++ }])
    sync()
  }, [sync])
  const push = useCallback((node: ReactNode, tone?: string) => {
    depth.current += 1
    setSheets((s) => [...s, { node, tone, key: nextKey++ }])
    sync()
  }, [sync])
  const close = useCallback(() => {
    depth.current = Math.max(0, depth.current - 1)
    setSheets((s) => s.slice(0, -1))
    sync()
  }, [sync])

  useEffect(() => {
    // a reload keeps history state; no sheet is open after one
    if (history.state?.sheet) history.replaceState({ ...history.state, sheet: 0 }, '')
    const onPop = (e: PopStateEvent) => {
      // back (or our own history.go) landed on the entry for this many sheets
      entries.current = Number(e.state?.sheet) || 0
      if (depth.current > entries.current) {
        const keep = entries.current
        depth.current = keep
        setSheets((s) => s.slice(0, keep))
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const showToast = useCallback((msg: string, opts: { flame?: boolean; error?: boolean } = {}) => {
    clearTimeout(timer.current)
    setToast({ msg, ...opts, id: Date.now() })
    timer.current = setTimeout(() => setToast(null), opts.error ? 4500 : 2600)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && depth.current > 0 && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  const api = useMemo(() => ({ open, push, close, toast: showToast }), [open, push, close, showToast])
  return (
    <UICtx.Provider value={api}>
      <StateCtx.Provider value={{ sheets, toast }}>{children}</StateCtx.Provider>
    </UICtx.Provider>
  )
}

/** Where the bottom sheets and toast render. Place it inside the app frame and the store. */
export function UIOutlet() {
  const { sheets, toast } = useContext(StateCtx)
  const { close } = useUI()
  return (
    <>
      {sheets.map((sheet, i) => {
        const top = i === sheets.length - 1
        return (
          // Sheets below the top stay mounted (hidden) so they keep what was typed.
          <div
            key={sheet.key}
            className="sheet-wrap"
            hidden={!top}
            style={sheet.tone ? ({ '--acc': sheet.tone } as CSSProperties) : undefined}
            onClick={(e) => e.target === e.currentTarget && close()}
          >
            <SheetFrame onClose={close}>{sheet.node}</SheetFrame>
          </div>
        )
      })}
      {!sheets.length && <UpdateNotice />}
      {toast && (
        <div className={'toast' + (toast.error ? ' err' : '')} role="status" key={toast.id}>
          {toast.flame && <IconFlame />}
          <span>{toast.msg}</span>
        </div>
      )}
    </>
  )
}

/** A sheet that closes when dragged down by its handle. The body never drags, so scrolling cannot close it by mistake. */
function SheetFrame({ onClose, children }: { onClose(): void; children: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = frame.current!
    let y0 = 0
    let t0 = 0
    let dy = 0
    let mode: 'none' | 'maybe' | 'drag' = 'none'

    const begin = (y: number) => {
      y0 = y
      t0 = performance.now()
      dy = 0
      mode = 'maybe'
    }
    const onHandle = (e: Event) => !!(e.target as Element).closest('.grab-zone')
    // Returns true while dragging, so the caller can stop the body from scrolling.
    const move = (y: number) => {
      if (mode === 'none') return false
      dy = y - y0
      if (mode === 'maybe') {
        if (dy > 8) {
          mode = 'drag'
          el.style.transition = 'none'
        } else if (dy < -8) {
          mode = 'none'
        }
      }
      if (mode === 'drag') el.style.transform = `translateY(${Math.max(0, dy)}px)`
      return mode === 'drag'
    }
    const end = () => {
      if (mode !== 'drag') return void (mode = 'none')
      mode = 'none'
      const fast = dy / (performance.now() - t0) > 0.6
      if (dy > 110 || (fast && dy > 30)) {
        el.style.transition = 'transform 0.18s ease-in'
        el.style.transform = 'translateY(110%)'
        setTimeout(onClose, 170)
      } else {
        el.style.transition = 'transform 0.2s ease-out'
        el.style.transform = ''
      }
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || !onHandle(e)) return void (mode = 'none')
      begin(e.touches[0].clientY)
    }
    const onTouchMove = (e: TouchEvent) => {
      if (move(e.touches[0].clientY) && e.cancelable) e.preventDefault()
    }
    const onMouseDown = (e: MouseEvent) => {
      if (!onHandle(e)) return
      begin(e.clientY)
      const mm = (ev: MouseEvent) => move(ev.clientY)
      const mu = () => {
        window.removeEventListener('mousemove', mm)
        window.removeEventListener('mouseup', mu)
        end()
      }
      window.addEventListener('mousemove', mm)
      window.addEventListener('mouseup', mu)
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', end)
    el.addEventListener('touchcancel', end)
    el.addEventListener('mousedown', onMouseDown)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', end)
      el.removeEventListener('touchcancel', end)
      el.removeEventListener('mousedown', onMouseDown)
    }
  }, [onClose])

  return (
    <div className="sheet" role="dialog" aria-modal="true" ref={frame}>
      <div className="grab-zone"><div className="grab" /></div>
      <div className="sheet-body">{children}</div>
    </div>
  )
}

/** Shows that a new version is being switched to, then switches. Mounted only while no sheet is open. */
function UpdateNotice() {
  const ready = useUpdateReady()
  const { t } = useI18n()
  useEffect(() => {
    if (!ready) return
    // long enough to read before the reload
    const timer = setTimeout(applyUpdate, 1500)
    return () => clearTimeout(timer)
  }, [ready])
  if (!ready) return null
  return <div className="toast" role="status"><span aria-busy="true">{t('updating')}</span></div>
}
