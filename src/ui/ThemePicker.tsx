import type { Theme } from '../domain/types'
import { useI18n } from '../i18n'
import { THEMES } from './bits'

/** One card per theme, each a tiny preview drawn with that theme's own tokens. */
export function ThemePicker({ value, onChange }: { value: Theme; onChange(theme: Theme): void }) {
  const { t } = useI18n()
  return (
    <div className="themes" role="group" aria-label={t('theme')}>
      {THEMES.map((th) => (
        <button key={th} type="button" aria-pressed={value === th} onClick={() => onChange(th)}>
          <span className="theme-sw" data-skin={th}><i /><i /></span>
          {t(`theme_${th}`)}
        </button>
      ))}
    </div>
  )
}
