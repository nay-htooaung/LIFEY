import { useI18n } from '../i18n'
import { useStore } from '../data/store'
import { CHARACTERS, Character } from '../ui/characters'
import { useUI } from '../ui/ui'

/** Pick a profile character, or just the initial. Opened from the avatar on the profile sheet. */
export function CharacterSheet() {
  const { snap, setPrefs } = useStore()
  const ui = useUI()
  const { t } = useI18n()
  const pick = (avatar: string | null) => {
    setPrefs({ avatar })
    ui.close()
  }
  return (
    <>
      <h2>{t('character')}</h2>
      <div className="chars">
        <button aria-pressed={!snap.me.avatar} aria-label={t('initialOnly')} onClick={() => pick(null)}
          style={{ background: snap.me.color }}>
          {[...(snap.me.displayName || t('me'))][0]?.toUpperCase()}
        </button>
        {CHARACTERS.map((c) => (
          <button key={c} aria-pressed={snap.me.avatar === c} aria-label={`${t('character')} ${c.slice(1)}`} onClick={() => pick(c)}>
            <Character id={c} />
          </button>
        ))}
      </div>
    </>
  )
}
