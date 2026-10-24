import { useState } from 'react'
import { addDays } from '../domain/dates'
import { potShares, potThisMonth, potTotal } from '../domain/money'
import type { Pot } from '../domain/types'
import { useI18n, yen } from '../i18n'
import { toneVar, usePersonName, useStore, useSubmit } from '../data/store'
import { parseYen, SWATCHES } from '../ui/bits'
import { IconX } from '../ui/icons'
import { Dot, Select } from '../ui/Select'
import { useUI } from '../ui/ui'

/** A 貯金 pot: create or change it, see what went in and out, delete it. */
export function PotSheet({ pot, onSaved }: { pot?: Pot; onSaved?: (id: string) => void }) {
  const { snap, space, today } = useStore()
  const { submit, pending, busy } = useSubmit()
  const person = usePersonName()
  const { t, dateShort } = useI18n()
  const spaceId = pot?.spaceId ?? space.id
  const [name, setName] = useState(pot?.name ?? '')
  const [color, setColor] = useState(pot?.color ?? SWATCHES[0])
  const [goal, setGoal] = useState(pot?.goal ? String(pot.goal) : '')
  const [monthly, setMonthly] = useState(pot?.monthly ? String(pot.monthly) : '')
  const [confirm, setConfirm] = useState(false)
  const moves = pot ? snap.potMoves.filter((m) => m.potId === pot.id) : []

  const save = async () => {
    const n = name.trim()
    if (!n) return document.getElementById('pot-name')?.focus()
    const sort = pot?.sort ?? snap.pots.filter((p) => p.spaceId === spaceId).length + 1
    const r = await submit('save',
      (repo) => repo.savePot({ id: pot?.id, spaceId, name: n, color, goal: parseYen(goal) || null, monthly: parseYen(monthly), sort }),
      pot ? t('saved') : t('created', { x: n }), { close: true })
    if (r?.ok) onSaved?.(r.value)
  }

  return (
    <>
      <h2>{pot ? t('potEdit') : t('potTitle')}</h2>
      {pot && (
        <div className="pot-sum">
          <span className="num big">{yen(potTotal(pot, snap.potMoves))}</span>
          <span className="muted small">
            {[pot.goal ? t('ofGoal', { a: yen(pot.goal) }) : '', pot.monthly ? t('thisMonthOf', { a: yen(Math.max(0, potThisMonth(pot, snap.potMoves, today))), b: yen(pot.monthly) }) : '']
              .filter(Boolean).join(' · ')}
          </span>
        </div>
      )}
      <div className="field">
        <label className="label" htmlFor="pot-name">{t('name')}</label>
        <input id="pot-name" value={name} maxLength={40} placeholder={t('potPh')} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="two">
        <div className="field">
          <label className="label" htmlFor="pot-monthly">{t('potMonthly')}</label>
          <input id="pot-monthly" inputMode="numeric" value={monthly} placeholder={t('optional')} onChange={(e) => setMonthly(e.target.value)} />
        </div>
        <div className="field">
          <label className="label" htmlFor="pot-goal">{t('potGoal')}</label>
          <input id="pot-goal" inputMode="numeric" value={goal} placeholder={t('optional')} onChange={(e) => setGoal(e.target.value)} />
        </div>
      </div>
      <p className="privacy">{t('potMonthlyHint')}</p>
      <div className="field">
        <span className="label">{t('colour')}</span>
        <div className="swatches">
          {SWATCHES.map((c) => (
            <button key={c} style={{ background: c }} aria-label={c} aria-pressed={c === color} onClick={() => setColor(c)} />
          ))}
        </div>
      </div>
      <button className="btn primary big" disabled={busy} aria-busy={pending === 'save'} onClick={save}>{pot ? t('save') : t('create')}</button>

      {pot && moves.length > 0 && (
        <>
          <div className="label">{t('potHistory')}</div>
          <div className="card list">
            {moves.slice(0, 30).map((m) => (
              <div key={m.id} className="row pot-move">
                <div className="main">
                  <div className="t">{m.note || (m.amount > 0 ? t('saveIn') : t('takeOut'))}</div>
                  <div className="s">{dateShort(m.occurredOn)} · {person(m.createdBy)}</div>
                </div>
                <span className={'amt num' + (m.amount > 0 ? ' amt-in' : '')}>{m.amount > 0 ? '+' : '-'}{yen(Math.abs(m.amount))}</span>
                {m.createdBy === snap.me.id && (
                  <button className="ch-x" aria-label={t('del')} disabled={busy} aria-busy={pending === m.id}
                    onClick={() => void submit(m.id, (r) => r.deletePotMove(m.id), t('deleted'))}>{pending !== m.id && <IconX />}</button>
                )}
              </div>
            ))}
          </div>
          {snap.spaces.find((s) => s.id === pot.spaceId)?.kind === 'household' && (
            <p className="small muted">{potShares(pot, snap.potMoves).map((x) => `${person(x.id)} ${yen(x.amount)}`).join(' · ')}</p>
          )}
        </>
      )}
      {pot && (
        <button className="btn danger" disabled={busy} aria-busy={pending === 'archive'}
          onClick={() => {
            if (!confirm) return setConfirm(true)
            void submit('archive', (r) => r.setPotArchived(pot.id, true), t('archived', { x: pot.name }), { close: true })
          }}>
          {confirm ? t('confirmDel') : t('deletePot')}
        </button>
      )}
    </>
  )
}

/** The 貯金 tab of the + sheet: put money into a pot or take it out. Nothing moves between accounts. */
export function PotMoveForm({ initialSpaceId }: { initialSpaceId?: string }) {
  const { snap, space, today } = useStore()
  const { submit, pending } = useSubmit()
  const ui = useUI()
  const { t } = useI18n()
  const [spaceId, setSpaceId] = useState(initialSpaceId ?? space.id)
  const pots = snap.pots.filter((p) => p.spaceId === spaceId && !p.archived)
  const [potId, setPotId] = useState<string | null>(null)
  const [out, setOut] = useState(false)
  const [amount, setAmount] = useState('0')
  const [date, setDate] = useState(today)
  const [note, setNote] = useState('')
  const chosen = pots.find((p) => p.id === potId) ?? pots[0]
  const target = snap.spaces.find((s) => s.id === spaceId) ?? space
  const n = parseInt(amount, 10) || 0

  const press = (k: string) => {
    if (k === 'del') return setAmount((a) => (a.length > 1 ? a.slice(0, -1) : '0'))
    setAmount((a) => {
      const next = a === '0' ? (k === '00' ? '0' : k) : a + k
      return next.length > 9 ? a : next
    })
  }
  const save = () => {
    if (!n || !chosen) return
    void submit('save', (r) => r.addPotMove({ potId: chosen.id, spaceId, amount: out ? -n : n, occurredOn: date, note: note.trim() }),
      t(out ? 'potTaken' : 'potSaved', { a: yen(n), p: chosen.name }), { close: true })
  }

  return (
    <>
      <div className="seg" role="group">
        <button aria-pressed={!out} onClick={() => setOut(false)}>{t('saveIn')}</button>
        <button aria-pressed={out} onClick={() => setOut(true)}>{t('takeOut')}</button>
      </div>
      <div className={'amount-disp num' + (n ? '' : ' zero')} aria-live="polite">{out && n ? '-' : ''}{yen(n)}</div>
      <div className="picks">
        {snap.spaces.length > 1 && (
          <div className="pick">
            <label className="pick-l" htmlFor="move-space">{t('saveTo')}</label>
            <Select id="move-space" value={spaceId} onChange={(v) => { setSpaceId(v); setPotId(null) }}
              options={snap.spaces.map((s) => ({ value: s.id, label: s.name, icon: <Dot color={toneVar(s)} round /> }))} />
          </div>
        )}
        <div className="pick">
          <label className="pick-l" htmlFor="move-pot">{t('savings')}</label>
          <Select id="move-pot" value={chosen?.id ?? ''} onChange={setPotId} placeholder="—"
            options={pots.map((p) => ({ value: p.id, label: p.name, icon: <Dot color={p.color} />, hint: yen(potTotal(p, snap.potMoves)) }))}
            onNew={() => ui.push(<PotSheet onSaved={setPotId} />, toneVar(target))} newLabel={t('newPot')} />
        </div>
      </div>
      <div className="keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del'].map((k) => (
          <button key={k} onClick={() => press(k)} aria-label={k === 'del' ? 'Delete' : k}>{k === 'del' ? '⌫' : k}</button>
        ))}
      </div>
      <details>
        <summary>{t('potDetails')}</summary>
        <div className="stack">
          <div className="field">
            <label className="label" htmlFor="move-note">{t('note')}</label>
            <input id="move-note" value={note} maxLength={200} placeholder={t('optional')} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="move-date">{t('date')}</label>
            <div className="chips">
              <button className="chip" aria-pressed={date === today} onClick={() => setDate(today)}>{t('today')}</button>
              <button className="chip" aria-pressed={date === addDays(today, -1)} onClick={() => setDate(addDays(today, -1))}>{t('yesterday')}</button>
              <input id="move-date" className="input" type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} style={{ width: 'auto' }} />
            </div>
          </div>
        </div>
      </details>
      {!pots.length && <p className="privacy">{t('needPot')}</p>}
      <button className="btn primary big" disabled={!n || !chosen || !!pending} aria-busy={pending === 'save'} onClick={save}>
        {!n ? t('enterAmt') : t(out ? 'takeOutX' : 'saveInX', { a: yen(n) })}
      </button>
    </>
  )
}
