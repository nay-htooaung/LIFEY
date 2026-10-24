import { useI18n } from '../i18n'
import { useStore, useSubmit } from '../data/store'
import type { Repo } from '../data/repo'
import { SpaceDot } from '../ui/bits'

interface Item {
  key: string
  name: string
  /** The space it belongs to; none for a space itself. */
  where?: string
  restore(r: Repo): Promise<void>
}

export function deletedCount(snap: ReturnType<typeof useStore>['snap']) {
  return snap.deletedSpaces.length + snap.sources.filter((s) => s.archived).length + snap.methods.filter((m) => m.archived).length
    + snap.pots.filter((p) => p.archived).length
}

/** Everything deleted, in one place: spaces I own, and sources, methods and 貯金 pots in my spaces. Each can be restored. */
export function DeletedSheet() {
  const { snap } = useStore()
  const { submit, pending, busy } = useSubmit()
  const { t } = useI18n()
  const spaceName = (id: string) => snap.spaces.find((s) => s.id === id)?.name
  const groups: [string, Item[]][] = [
    [t('spacesTitle'), snap.deletedSpaces.map((s) => ({ key: `sp:${s.id}`, name: s.name, restore: (r) => r.setSpaceDeleted(s.id, false) }))],
    [t('sources'), snap.sources.filter((s) => s.archived)
      .map((s) => ({ key: `src:${s.id}`, name: s.name, where: spaceName(s.spaceId), restore: (r) => r.setSourceArchived(s.id, false) }))],
    [t('methods'), snap.methods.filter((m) => m.archived)
      .map((m) => ({ key: `m:${m.id}`, name: m.name, where: spaceName(m.spaceId), restore: (r) => r.setMethodArchived(m.id, false) }))],
    [t('savings'), snap.pots.filter((p) => p.archived)
      .map((p) => ({ key: `pot:${p.id}`, name: p.name, where: spaceName(p.spaceId), restore: (r) => r.setPotArchived(p.id, false) }))],
  ]
  const tones = new Map(snap.deletedSpaces.map((s) => [`sp:${s.id}`, s.tone]))

  return (
    <>
      <h2>{t('deletedItems')}</h2>
      {groups.every(([, items]) => !items.length) && <p className="empty">{t('nothingDeleted')}</p>}
      {groups.filter(([, items]) => items.length).map(([label, items]) => (
        <div key={label} className="field">
          <span className="label">{label}</span>
          <div className="card list">
            {items.map((d) => (
              <div key={d.key} className="row">
                {tones.has(d.key) && <SpaceDot name={d.name} tone={tones.get(d.key)!} />}
                <div className="main">
                  <div className="t">{d.name}</div>
                  {d.where && <div className="s">{d.where}</div>}
                </div>
                <button className="btn sm" disabled={busy} aria-busy={pending === d.key}
                  onClick={() => submit(d.key, d.restore, t('spaceRestored', { x: d.name }))}>
                  {t('restore')}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}
