import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { IconFlame } from './icons'

interface Toast { msg: string; flame?: boolean; error?: boolean; id: number }
interface Sheet { node: ReactNode; tone?: string; key: number }
interface UI {
  open(node: ReactNode, tone?: string): void
  close(): void
  toast(msg: string, opts?: { flame?: boolean; error?: boolean }): void
}

const UICtx = createContext<UI | null>(null)
const StateCtx = createContext<{ sheet: Sheet | null; toast: Toast | null }>({ sheet: null, toast: null })

export const useUI = () => {
  const ui = useContext(UICtx)
  if (!ui) throw new Error('useUI outside UIProvider')
  return ui
}

export function UIProvider({ children }: { children: ReactNode }) {
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const close = useCallback(() => setSheet(null), [])
  const open = useCallback((node: ReactNode, tone?: string) => setSheet({ node, tone, key: Date.now() }), [])
  const showToast = useCallback((msg: string, opts: { flame?: boolean; error?: boolean } = {}) => {
    clearTimeout(timer.current)
    setToast({ msg, ...opts, id: Date.now() })
    timer.current = setTimeout(() => setToast(null), opts.error ? 4500 : 2600)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSheet(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const api = useMemo(() => ({ open, close, toast: showToast }), [open, close, showToast])
  return (
    <UICtx.Provider value={api}>
      <StateCtx.Provider value={{ sheet, toast }}>{children}</StateCtx.Provider>
    </UICtx.Provider>
  )
}

/** Where the current bottom sheet and toast render. Place it inside the app frame and the store. */
export function UIOutlet() {
  const { sheet, toast } = useContext(StateCtx)
  const { close } = useUI()
  return (
    <>
      {sheet && (
        <div
          className="sheet-wrap"
          style={sheet.tone ? ({ '--acc': sheet.tone } as CSSProperties) : undefined}
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div className="sheet" role="dialog" aria-modal="true" key={sheet.key}>
            <div className="grab" />
            {sheet.node}
          </div>
        </div>
      )}
      {toast && (
        <div className={'toast' + (toast.error ? ' err' : '')} role="status" key={toast.id}>
          {toast.flame && <IconFlame />}
          <span>{toast.msg}</span>
        </div>
      )}
    </>
  )
}
