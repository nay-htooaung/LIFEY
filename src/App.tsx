import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Locale } from './domain/types'
import { createCloudRepo } from './data/cloud'
import { createDemoRepo, type DemoRepo } from './data/demo'
import type { Repo } from './data/repo'
import { StoreProvider, toneVar, useStore } from './data/store'
import { supabase } from './data/supabase'
import { useI18n } from './i18n'
import { Activity } from './screens/Activity'
import { Plan } from './screens/Plan'
import { SignIn } from './screens/SignIn'
import { Today } from './screens/Today'
import { Wallet } from './screens/Wallet'
import { EntrySheet } from './sheets/EntrySheet'
import { LOCALE_KEY, MenuSheet } from './sheets/MenuSheet'
import { SpacesSheet } from './sheets/SpacesSheet'
import { SpaceDot } from './ui/bits'
import { IconChevron, IconList, IconPlan, IconPlus, IconToday, IconWallet } from './ui/icons'
import { UIOutlet, UIProvider, useUI } from './ui/ui'

type Tab = 'today' | 'activity' | 'wallet' | 'plan'
const MODE_KEY = 'lifey-mode'

const store = {
  get(k: string) {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  set(k: string, v: string | null) {
    try {
      if (v === null) localStorage.removeItem(k)
      else localStorage.setItem(k, v)
    } catch {
      /* ignore */
    }
  },
}

const initialLocale = (): Locale => {
  const saved = store.get(LOCALE_KEY)
  if (saved === 'en' || saved === 'ja') return saved
  return typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('ja') ? 'ja' : 'en'
}

export function App() {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null)
  const [demo, setDemo] = useState(() => !supabase || store.get(MODE_KEY) === 'demo')
  const [demoKey, setDemoKey] = useState(0)

  const setLocale = (l: Locale) => {
    store.set(LOCALE_KEY, l)
    setLocaleState(l)
  }

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const userId = session?.user.id
  const repo = useMemo<Repo | null>(() => {
    if (userId && supabase) return createCloudRepo(supabase, userId)
    if (demo) return createDemoRepo(locale)
    return null
    // locale only seeds a fresh demo; changing it later must not rebuild the repo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, demo, demoKey])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  if (session === undefined) return <div className="splash">lifey</div>
  if (!repo) {
    return (
      <SignIn
        sb={supabase!}
        locale={locale}
        setLocale={setLocale}
        onDemo={() => {
          store.set(MODE_KEY, 'demo')
          setDemo(true)
        }}
      />
    )
  }

  const signOut = async () => {
    if (repo.mode === 'cloud') await repo.signOut()
    if (supabase) {
      store.set(MODE_KEY, null)
      setDemo(false)
    }
  }
  const resetDemo = () => {
    ;(repo as DemoRepo).reset(locale)
    setDemoKey((k) => k + 1)
  }

  return (
    <UIProvider>
      <StoreProvider key={`${repo.mode}-${userId ?? 'demo'}-${demoKey}`} repo={repo} fallback={<div className="splash">lifey</div>}>
        <Shell onSignOut={signOut} onResetDemo={repo.mode === 'demo' ? resetDemo : undefined} canSignOut={!!supabase} />
      </StoreProvider>
    </UIProvider>
  )
}

function Shell({ onSignOut, onResetDemo, canSignOut }: { onSignOut(): void; onResetDemo?: () => void; canSignOut: boolean }) {
  const { space, snap } = useStore()
  const ui = useUI()
  const { t, locale } = useI18n()
  const [tab, setTab] = useState<Tab>('today')

  useEffect(() => {
    document.documentElement.lang = locale
    store.set(LOCALE_KEY, locale)
  }, [locale])

  const tabs: [Tab | 'add', string, typeof IconToday][] = [
    ['today', t('today'), IconToday], ['activity', t('activity'), IconList], ['add', '', IconPlus],
    ['wallet', t('wallet'), IconWallet], ['plan', t('plan'), IconPlan],
  ]
  const label = space.kind === 'personal' ? snap.me.displayName || t('me') : space.name

  return (
    <div className="app" style={{ '--acc': toneVar(space) } as CSSProperties}>
      <header className="top">
        <button className="mod-btn" aria-label="lifey"
          onClick={() => ui.open(<MenuSheet onSignOut={canSignOut ? onSignOut : undefined} onResetDemo={onResetDemo} />)}>
          lifey <small>{t('money')}</small><IconChevron />
        </button>
        <button className="space-btn" aria-label={`${t('space')}: ${space.name}`} onClick={() => ui.open(<SpacesSheet />)}>
          <SpaceDot name={space.kind === 'personal' ? label : space.name} tone={space.tone} />
          <span className="nm">{space.name}</span><IconChevron />
        </button>
      </header>
      <main className="scroll" key={tab + space.id}>
        {tab === 'today' && <Today go={setTab} />}
        {tab === 'activity' && <Activity />}
        {tab === 'wallet' && <Wallet />}
        {tab === 'plan' && <Plan />}
      </main>
      <nav className="nav">
        {tabs.map(([k, l, Icon]) =>
          k === 'add' ? (
            <button key={k} className="fab" aria-label={t('logSpend')} onClick={() => ui.open(<EntrySheet />, toneVar(space))}><Icon /></button>
          ) : (
            <button key={k} aria-current={tab === k ? 'page' : undefined} onClick={() => setTab(k)}><Icon />{l}</button>
          ),
        )}
      </nav>
      <UIOutlet />
    </div>
  )
}
