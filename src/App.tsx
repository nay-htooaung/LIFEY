import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Locale, Theme } from './domain/types'
import { createCloudRepo } from './data/cloud'
import { createDemoRepo, type DemoRepo } from './data/demo'
import type { Repo } from './data/repo'
import { LOCALE_KEY, StoreProvider, toneVar, useStore } from './data/store'
import { supabase } from './data/supabase'
import { useI18n } from './i18n'
import { AssistantProvider, AssistantSheet } from './assistant/AssistantSheet'
import { Activity } from './screens/Activity'
import { Plan } from './screens/Plan'
import { SignIn } from './screens/SignIn'
import { Today } from './screens/Today'
import { Wallet } from './screens/Wallet'
import { EntrySheet } from './sheets/EntrySheet'
import { MenuSheet } from './sheets/MenuSheet'
import { ProfileSheet } from './sheets/ProfileSheet'
import { SpacesSheet } from './sheets/SpacesSheet'
import { Avatar, SpaceDot } from './ui/bits'
import { IconChevron, IconList, IconPlan, IconPlus, IconSpark, IconToday, IconWallet } from './ui/icons'
import { UIOutlet, UIProvider, useUI } from './ui/ui'

type Tab = 'today' | 'activity' | 'wallet' | 'plan'

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
  const [demoKey, setDemoKey] = useState(0)
  // set when the theme is changed on the sign-in screen, so the account picks it up
  const [pickedTheme, setPickedTheme] = useState<Theme>()

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
    // without Supabase settings (local development) the app runs on example data
    if (!supabase) return createDemoRepo(locale)
    return null
    // locale only seeds a fresh demo; changing it later must not rebuild the repo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, demoKey])

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
        onTheme={setPickedTheme}
      />
    )
  }

  const signOut = async () => {
    if (repo.mode === 'cloud') await repo.signOut()
    setPickedTheme(undefined)
  }
  const resetDemo = () => {
    ;(repo as DemoRepo).reset(locale)
    setDemoKey((k) => k + 1)
  }

  return (
    <UIProvider>
      <StoreProvider key={`${repo.mode}-${userId ?? 'demo'}-${demoKey}`} repo={repo} pickedTheme={pickedTheme} fallback={<div className="splash">lifey</div>}>
        <Shell onSignOut={signOut} onResetDemo={repo.mode === 'demo' ? resetDemo : undefined} canSignOut={!!supabase} />
      </StoreProvider>
    </UIProvider>
  )
}

function Shell({ onSignOut, onResetDemo, canSignOut }: { onSignOut(): Promise<void>; onResetDemo?: () => void; canSignOut: boolean }) {
  const { space, snap, syncing } = useStore()
  const ui = useUI()
  const { t, locale } = useI18n()
  // Other tabs sit one history entry above Today, so Android's back returns to Today before leaving.
  const [tab, setTab] = useState<Tab>(() => history.state?.tab ?? 'today')
  const go = (k: Tab) => {
    if (k === tab) return
    if (k === 'today') {
      if (history.state?.tab) history.back()
      else setTab('today')
      return
    }
    if (tab === 'today') history.pushState({ tab: k }, '')
    else history.replaceState({ tab: k }, '')
    setTab(k)
  }

  useEffect(() => {
    const onPop = (e: PopStateEvent) => setTab(e.state?.tab ?? 'today')
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
    store.set(LOCALE_KEY, locale)
  }, [locale])

  const tabs: [Tab | 'add', string, typeof IconToday][] = [
    ['today', t('thisMonthTab'), IconToday], ['activity', t('activity'), IconList], ['add', '', IconPlus],
    ['wallet', t('wallet'), IconWallet], ['plan', t('plan'), IconPlan],
  ]
  const label = space.kind === 'personal' ? snap.me.displayName || t('me') : space.name

  return (
    <AssistantProvider>
    <div className="app" style={{ '--acc': toneVar(space) } as CSSProperties}>
      <header className="top">
        <button className="mod-btn" aria-label="lifey"
          onClick={() => ui.open(<MenuSheet />)}>
          lifey <small>{t('money')}</small><IconChevron />
        </button>
        <div className="top-r">
          <button className="ai-btn" aria-label={t('assistant')} onClick={() => ui.open(<AssistantSheet />)}><IconSpark /></button>
          <button className="space-btn" aria-label={`${t('space')}: ${space.name}`} onClick={() => ui.open(<SpacesSheet />)}>
            <SpaceDot name={space.kind === 'personal' ? label : space.name} tone={space.tone} />
            <span className="nm">{space.name}</span><IconChevron />
          </button>
          <button className="me-btn" aria-label={t('profile')}
            onClick={() => ui.open(<ProfileSheet onSignOut={canSignOut ? onSignOut : undefined} onResetDemo={onResetDemo} />)}>
            <Avatar profile={snap.me} label={snap.me.displayName || t('me')} />
          </button>
        </div>
      </header>
      {/* shows only when saving or loading takes more than a moment */}
      <div className={'sync-bar' + (syncing ? ' on' : '')} role="progressbar" aria-hidden={!syncing} aria-label={t('loading')} />
      <main className="scroll" key={tab + space.id}>
        {tab === 'today' && <Today />}
        {tab === 'activity' && <Activity />}
        {tab === 'wallet' && <Wallet />}
        {tab === 'plan' && <Plan />}
      </main>
      <nav className="nav">
        {tabs.map(([k, l, Icon]) =>
          k === 'add' ? (
            <button key={k} className="fab" aria-label={t('logSpend')} onClick={() => ui.open(<EntrySheet />, toneVar(space))}><Icon /></button>
          ) : (
            <button key={k} aria-current={tab === k ? 'page' : undefined} onClick={() => go(k)}><Icon />{l}</button>
          ),
        )}
      </nav>
      <UIOutlet />
    </div>
    </AssistantProvider>
  )
}
