import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { today as todayFn } from '../domain/dates'
import { dueOccurrences } from '../domain/recurring'
import type { Day, PaymentMethod, Snapshot, Source, Space } from '../domain/types'
import { I18nContext, makeI18n, useI18n } from '../i18n'
import { useUI } from '../ui/ui'
import { RepoError, type Repo } from './repo'

interface Store {
  snap: Snapshot
  repo: Repo
  today: Day
  space: Space
  personal: Space
  setSpace(id: string): void
  /** Runs a change, reloads, and shows a toast. Errors become an error toast. */
  act<T>(fn: (repo: Repo) => Promise<T>, done?: string | ((v: T) => string), opts?: { flame?: boolean }): Promise<T | undefined>
  reload(): Promise<void>
}

const StoreCtx = createContext<Store | null>(null)
export const useStore = () => {
  const s = useContext(StoreCtx)
  if (!s) throw new Error('useStore outside StoreProvider')
  return s
}

const SPACE_KEY = 'lifey-space'

export function StoreProvider({ repo, children, fallback }: { repo: Repo; children: ReactNode; fallback: ReactNode }) {
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [spaceId, setSpaceId] = useState<string>(() => {
    try {
      return localStorage.getItem(SPACE_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [day, setDay] = useState(todayFn())
  const [error, setError] = useState<string | null>(null)
  const ui = useUI()
  const loading = useRef(false)

  const reload = useCallback(async () => {
    if (loading.current) return
    loading.current = true
    try {
      const d = todayFn()
      setDay(d)
      let s = await repo.load()
      const due = dueOccurrences(s.entries, s.me.id, d)
      if (due.length) {
        await repo.addEntries(due)
        s = await repo.load()
      }
      setSnap(s)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      loading.current = false
    }
  }, [repo])

  useEffect(() => {
    void reload()
    return repo.subscribe(() => void reload())
  }, [repo, reload])

  const i18n = useMemo(() => makeI18n(snap?.me.locale ?? 'en'), [snap?.me.locale])

  const value = useMemo<Store | null>(() => {
    if (!snap) return null
    const personal = snap.spaces.find((s) => s.kind === 'personal' && s.ownerId === snap.me.id) ?? snap.spaces[0]
    const space = snap.spaces.find((s) => s.id === spaceId) ?? personal
    return {
      snap,
      repo,
      today: day,
      space,
      personal,
      setSpace(id) {
        setSpaceId(id)
        try {
          localStorage.setItem(SPACE_KEY, id)
        } catch {
          /* ignore */
        }
      },
      reload,
      async act(fn, done, opts) {
        try {
          const v = await fn(repo)
          await reload()
          if (done) ui.toast(typeof done === 'string' ? done : done(v), opts)
          return v
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          if (e instanceof RepoError && e.code === 'bad_invite') ui.toast(i18n.t('badCode'), { error: true })
          else if (e instanceof RepoError && e.code === 'offline') ui.toast(i18n.t('offline'), { error: true })
          else ui.toast(i18n.t('genericError', { m: msg }), { error: true })
          return undefined
        }
      },
    }
  }, [snap, repo, day, spaceId, reload, ui, i18n])

  if (!value) {
    return (
      <I18nContext.Provider value={i18n}>
        {error ? <div className="splash"><p className="empty">{i18n.t('genericError', { m: error })}</p></div> : fallback}
      </I18nContext.Provider>
    )
  }
  return (
    <I18nContext.Provider value={i18n}>
      <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
    </I18nContext.Provider>
  )
}

// ------------------------------------------------------------ selectors

export const toneVar = (s: Pick<Space, 'tone'>) => `var(--tone-${s.tone})`

export function useLookups() {
  const { snap } = useStore()
  return useMemo(() => {
    const cat = new Map(snap.categories.map((c) => [c.id, c]))
    const method = new Map<string, PaymentMethod>(snap.methods.map((m) => [m.id, m]))
    const source = new Map<string, Source>(snap.sources.map((s) => [s.id, s]))
    const space = new Map(snap.spaces.map((s) => [s.id, s]))
    return { cat, method, source, space }
  }, [snap])
}

/** "Sam" for others, the translated "You" for me. */
export function usePersonName() {
  const { snap } = useStore()
  const { t } = useI18n()
  return (id: string) => (id === snap.me.id ? t('you') : (snap.profiles[id]?.displayName ?? '—'))
}
