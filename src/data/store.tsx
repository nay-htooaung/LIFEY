import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { monthKey, today as todayFn } from '../domain/dates'
import { dueOccurrences } from '../domain/recurring'
import type { Day, Entry, PaymentMethod, Profile, Snapshot, Source, Space } from '../domain/types'
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
  /** Applies language, theme or character at once and saves them to the profile in the background. */
  setPrefs(patch: Prefs): void
  /** Runs a change, reloads, and shows a toast. Errors become an error toast. */
  act<T>(fn: (repo: Repo) => Promise<T>, done?: string | ((v: T) => string), opts?: { flame?: boolean }): Promise<T | undefined>
  reload(): Promise<void>
  /** Fetches a month's entries (YYYY-MM) into snap.entries once; later calls are free. */
  ensureMonth(month: string): void
  /** Whether snap.entries holds every entry of `month`. */
  hasMonth(month: string): boolean
}

const StoreCtx = createContext<Store | null>(null)
export const useStore = () => {
  const s = useContext(StoreCtx)
  if (!s) throw new Error('useStore outside StoreProvider')
  return s
}

const SPACE_KEY = 'lifey-space'
export const LOCALE_KEY = 'lifey-locale'
/** Read by index.html before first paint, so the saved theme shows without a flash. */
export const THEME_KEY = 'lifey-theme'
type Prefs = Partial<Pick<Profile, 'locale' | 'theme' | 'avatar'>>

export function StoreProvider({ repo, children, fallback }: { repo: Repo; children: ReactNode; fallback: ReactNode }) {
  const [loaded, setSnap] = useState<Snapshot | null>(null)
  const [spaceId, setSpaceId] = useState<string>(() => {
    try {
      return localStorage.getItem(SPACE_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [day, setDay] = useState(todayFn())
  const [error, setError] = useState<string | null>(null)
  // Choices made here win over the loaded profile, so they apply before the save has round-tripped.
  const [prefs, setPrefsState] = useState<Prefs>({})
  const ui = useUI()
  const loading = useRef(false)
  // Older months, fetched when History opens them. load() covers the current month.
  const [months, setMonths] = useState<Record<string, Entry[]>>({})
  const monthsRef = useRef(months)
  monthsRef.current = months
  const fetching = useRef(new Set<string>())

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
      // refresh the months already open, so edits there show up too
      const open = Object.keys(monthsRef.current)
      const fresh = await Promise.all(open.map((m) => repo.loadMonth(m)))
      setSnap(s)
      setMonths(Object.fromEntries(open.map((m, i) => [m, fresh[i]])))
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

  const locale = prefs.locale ?? loaded?.me.locale ?? 'en'
  const i18n = useMemo(() => makeI18n(locale), [locale])
  const theme = prefs.theme ?? loaded?.me.theme

  useEffect(() => {
    if (!theme) return
    document.documentElement.dataset.skin = theme
    // the browser bar follows the theme's page colour
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--paper').trim())
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  const value = useMemo<Store | null>(() => {
    if (!loaded) return null
    // the profile as it is now, including choices still being saved
    const me = { ...loaded.me, ...prefs }
    const extra = Object.values(months).flat()
    const seen = new Set(loaded.entries.map((e) => e.id))
    const entries = extra.length ? [...loaded.entries, ...extra.filter((e) => !seen.has(e.id) && seen.add(e.id))] : loaded.entries
    const snap: Snapshot = { ...loaded, me, profiles: { ...loaded.profiles, [me.id]: me }, entries }
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
      setPrefs(patch) {
        setPrefsState((p) => ({ ...p, ...patch }))
        if (patch.locale) {
          try {
            localStorage.setItem(LOCALE_KEY, patch.locale)
          } catch {
            /* ignore */
          }
        }
        repo.updateProfile(patch).catch((e) =>
          ui.toast(i18n.t('genericError', { m: e instanceof Error ? e.message : String(e) }), { error: true }))
      },
      reload,
      hasMonth: (m) => m >= monthKey(day) || m in months,
      ensureMonth(m) {
        if (m >= monthKey(day) || m in monthsRef.current || fetching.current.has(m)) return
        fetching.current.add(m)
        repo.loadMonth(m)
          .then((list) => setMonths((prev) => ({ ...prev, [m]: list })))
          .catch((e) => ui.toast(i18n.t('genericError', { m: e instanceof Error ? e.message : String(e) }), { error: true }))
          .finally(() => fetching.current.delete(m))
      },
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
  }, [loaded, months, prefs, repo, day, spaceId, reload, ui, i18n])

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
