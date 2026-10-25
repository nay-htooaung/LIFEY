import { useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { useStore } from '../data/store'
import { CHARACTERS, Character } from '../ui/characters'
import { IconCamera } from '../ui/icons'
import { avatarPhoto, isPhoto } from '../ui/photo'
import { useUI } from '../ui/ui'

/** Pick a photo, a profile character, or just the initial. Opened from the avatar on the profile sheet. */
export function CharacterSheet() {
  const { snap, setPrefs } = useStore()
  const ui = useUI()
  const { t } = useI18n()
  const file = useRef<HTMLInputElement>(null)
  const [reading, setReading] = useState(false)
  const pick = (avatar: string | null) => {
    setPrefs({ avatar })
    ui.close()
  }
  const usePhoto = async (f?: File) => {
    if (!f) return
    setReading(true)
    try {
      pick(await avatarPhoto(f))
    } catch {
      ui.toast(t('photoError'), { error: true })
    } finally {
      setReading(false)
    }
  }
  const photo = isPhoto(snap.me.avatar) ? snap.me.avatar : null
  return (
    <>
      <h2>{t('character')}</h2>
      <input ref={file} type="file" accept="image/*" hidden onChange={(e) => void usePhoto(e.target.files?.[0])} />
      <div className="chars">
        <button className="add-photo" aria-busy={reading} disabled={reading} onClick={() => file.current?.click()}>
          {!reading && <IconCamera />}{photo ? t('changePhoto') : t('addPhoto')}
        </button>
        {photo && (
          <button aria-pressed aria-label={t('yourPhoto')} onClick={() => ui.close()}><img src={photo} alt="" /></button>
        )}
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
