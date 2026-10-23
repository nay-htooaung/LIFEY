import { useState } from 'react'
import { useI18n, yen } from '../i18n'
import { toneVar, useLookups, usePersonName, useStore } from '../data/store'
import { Glyph } from '../ui/bits'
import { usePaidWith } from '../ui/entry'
import { IconLock } from '../ui/icons'
import { useUI } from '../ui/ui'
import { EntrySheet } from './EntrySheet'

export function EntryDetail({ id }: { id: string }) {
  const { snap, today, act } = useStore()
  const { cat, space: spaceOf } = useLookups()
  const ui = useUI()
  const { t, dateLong } = useI18n()
  const paidWith = usePaidWith()
  const person = usePersonName()
  const [confirm, setConfirm] = useState(false)
  const e = snap.entries.find((x) => x.id === id)
  if (!e) return null
  const c = e.categoryId ? cat.get(e.categoryId) : undefined
  const sp = spaceOf.get(e.spaceId)!
  const pw = paidWith(e)
  const mine = e.createdBy === snap.me.id
  const shared = sp.kind === 'household'
  const { id: _omit, createdBy: _by, ...rest } = e
  void _omit
  void _by

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Glyph category={c} />
        <div style={{ minWidth: 0 }}>
          <h2>{e.name || e.note || c?.name || '—'}</h2>
          <div className="small muted">{[c?.name, e.name && e.note].filter(Boolean).join(' · ')}</div>
        </div>
      </div>
      <div className="amount-disp left num">{e.kind === 'expense' ? '-' : '+'}{yen(e.amount)}</div>
      <div>
        <div className="kv"><span>{t('date')}</span><span>{dateLong(e.occurredOn)}</span></div>
        <div className="kv"><span>{t('space')}</span><span>{sp.name} · {shared ? t('sharedWith', { n: sp.memberIds.length }) : t('private')}</span></div>
        {shared && (
          <div className="kv"><span>{t('loggedBy')}</span>
            <span className="who"><i style={{ background: snap.profiles[e.createdBy]?.color ?? 'var(--muted)' }} />{person(e.createdBy)}</span></div>
        )}
        <div className="kv">
          <span>{e.kind === 'income' ? t('into') : t('paidWith')}</span>
          <span>
            {shared && pw.personal && <IconLock />} {pw.label}
            {shared && pw.mine && <><br /><small className="muted">{t('onlyYou')}</small></>}
          </span>
        </div>
        <div className="kv"><span>{t('repeat')}</span><span>{e.repeat === 'none' ? (e.repeatOf ? t('repeats') : t('never')) : t(e.repeat)}</span></div>
        <div className="kv"><span>{t('tags')}</span><span>{e.tags.length ? e.tags.map((g) => <span key={g} className="pill" style={{ marginLeft: 4 }}>#{g}</span>) : '—'}</span></div>
      </div>
      {mine && (
        <div className="btn-row">
          <button className="btn primary" onClick={() => ui.open(<EntrySheet prefill={{ ...rest, occurredOn: today, repeat: 'none', repeatOf: null }} />, toneVar(sp))}>
            {t('logAgain')}
          </button>
          <button className="btn" onClick={() => ui.open(<EntrySheet editId={e.id} />, toneVar(sp))}>{t('edit')}</button>
          <button
            className="btn danger"
            onClick={() => {
              if (!confirm) return setConfirm(true)
              ui.close()
              void act((r) => r.deleteEntry(e.id), t('deleted'))
            }}
          >
            {confirm ? t('confirmDel') : t('del')}
          </button>
        </div>
      )}
    </>
  )
}
