import { useI18n } from '../i18n'
import { useUI } from '../ui/ui'

/** Switches between Lifey modules. Only Money exists so far. */
export function MenuSheet() {
  const ui = useUI()
  const { t } = useI18n()

  return (
    <>
      <h2>lifey</h2>
      <p className="lead">{t('modsSub')}</p>
      <div className="mods">
        <button className="mod on" onClick={ui.close}><b>{t('money')}</b><small>{t('mMoney')}</small><span className="pill">{t('openL')}</span></button>
        <div className="mod"><b>{t('recipes')}</b><small>{t('mRecipes')}</small><span className="pill mute">{t('later')}</span></div>
        <div className="mod"><b>{t('fridge')}</b><small>{t('mFridge')}</small><span className="pill mute">{t('later')}</span></div>
        <div className="mod"><b>{t('tasks')}</b><small>{t('mTasks')}</small><span className="pill mute">{t('later')}</span></div>
      </div>
    </>
  )
}
