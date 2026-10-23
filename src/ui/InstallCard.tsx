import { useState } from 'react'
import { useI18n } from '../i18n'
import { promptInstall, useInstall } from './install'
import { useUI } from './ui'

const DISMISS_KEY = 'lifey-install-dismissed'
const dismissedBefore = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

/** Offers to install the app. `dismissible` cards (Today) stay hidden after "Not now"; the menu always shows it. */
export function InstallCard({ dismissible = false }: { dismissible?: boolean }) {
  const state = useInstall()
  const ui = useUI()
  const { t } = useI18n()
  const [dismissed, setDismissed] = useState(() => dismissible && dismissedBefore())

  if (state === 'none' || dismissed) return null

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
    setDismissed(true)
  }
  const install = async () => {
    if (await promptInstall()) ui.toast(t('installed'))
  }

  return (
    <div className="card stack">
      <div>
        <b>{t('installTitle')}</b>
        <div className="small muted">{state === 'ios' ? t('installIos') : t('installBody')}</div>
      </div>
      {(state === 'prompt' || dismissible) && (
        <div className="btn-row">
          {state === 'prompt' && <button className="btn primary" onClick={install}>{t('installBtn')}</button>}
          {dismissible && <button className="btn" onClick={dismiss}>{t('notNow')}</button>}
        </div>
      )}
    </div>
  )
}
