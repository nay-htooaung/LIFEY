import { useI18n } from '../i18n'
import { toneVar, usePersonName, useStore } from '../data/store'
import { Avatar, SpaceDot } from '../ui/bits'
import { IconEdit } from '../ui/icons'
import { useUI } from '../ui/ui'
import { CreateSpaceSheet, JoinSpaceSheet } from './NewSpaceSheet'
import { SpaceSheet } from './SpaceSheet'

/** Pick a space, open a space's settings, create or join one. */
export function SpacesSheet() {
  const { snap, space, setSpace } = useStore()
  const ui = useUI()
  const { t } = useI18n()
  const person = usePersonName()
  const pick = (id: string) => {
    setSpace(id)
    ui.close()
  }

  return (
    <>
      <h2>{t('spacesTitle')}</h2>
      {snap.spaces.map((s) => (
        <div key={s.id} className="sp-item" style={{ ['--acc' as string]: toneVar(s) }}>
          <button className="sp-row" aria-pressed={space.id === s.id} onClick={() => pick(s.id)}>
            <SpaceDot name={s.name} tone={s.tone} large />
            <span style={{ flex: 1, minWidth: 0 }}>
              <b>{s.name}</b><br />
              <span className="tiny muted">{s.kind === 'personal' ? t('onlyYouSp') : t('members', { n: s.memberIds.length })}</span>
            </span>
            {s.kind === 'household' && (
              <span className="avatars">{s.memberIds.map((id) => <Avatar key={id} profile={snap.profiles[id]} label={person(id)} />)}</span>
            )}
          </button>
          <button className="icon-btn" aria-label={t('spaceSettings', { x: s.name })} onClick={() => ui.push(<SpaceSheet id={s.id} />)}>
            <IconEdit />
          </button>
        </div>
      ))}

      <div className="btn-row">
        <button className="btn primary" onClick={() => ui.push(<CreateSpaceSheet />)}>{t('hhName')}</button>
        <button className="btn" onClick={() => ui.push(<JoinSpaceSheet />)}>{t('joinBtn')}</button>
      </div>
    </>
  )
}
