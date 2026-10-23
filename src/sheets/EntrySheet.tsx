import { useMemo, useState } from 'react'
import { addDays } from '../domain/dates'
import { streak } from '../domain/streak'
import type { EntryKind, NewEntry, Repeat } from '../domain/types'
import { useI18n, yen } from '../i18n'
import { toneVar, useStore } from '../data/store'
import { CategorySheet } from './CategorySheet'
import { MethodSheet } from './MethodSheet'
import { SourceSheet } from './SourceSheet'
import { IconLock } from '../ui/icons'
import { useUI } from '../ui/ui'
import { Dot, Select } from '../ui/Select'

const LAST_VIA = 'lifey-last-via'
const readLast = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(LAST_VIA) ?? '{}')
  } catch {
    return {}
  }
}

interface Props {
  /** Edit this entry instead of creating a new one. */
  editId?: string
  prefill?: Partial<NewEntry>
}

export function EntrySheet({ editId, prefill }: Props) {
  const { snap, space, personal, today, act } = useStore()
  const ui = useUI()
  const { t } = useI18n()
  const base = editId ? snap.entries.find((e) => e.id === editId) : undefined
  const init = { ...base, ...prefill }

  const [kind, setKind] = useState<EntryKind>(init.kind ?? 'expense')
  const [amount, setAmount] = useState(init.amount ? String(init.amount) : '0')
  const [spaceId, setSpaceId] = useState(init.spaceId ?? space.id)
  const [categoryId, setCategoryId] = useState<string | null>(init.categoryId ?? null)
  const [via, setVia] = useState<string | null>((init.kind === 'income' || !init.methodId ? init.sourceId : init.methodId) ?? null)
  const [name, setName] = useState(init.name ?? '')
  const [note, setNote] = useState(init.note ?? '')
  const [tags, setTags] = useState((init.tags ?? []).join(', '))
  const [date, setDate] = useState(init.occurredOn ?? today)
  const [repeat, setRepeat] = useState<Repeat>(base?.repeat ?? 'none')

  const target = snap.spaces.find((s) => s.id === spaceId) ?? space
  const cats = snap.categories.filter((c) => c.spaceId === spaceId && c.kind === kind)
  const spaceName = (id: string) => snap.spaces.find((s) => s.id === id)?.name ?? ''

  // Any method/source from a space I belong to. The target space's own first, then mine, then other households.
  // Expenses can also be paid straight from a bank or savings account (bank transfer).
  const options = useMemo(() => {
    const transfers = snap.sources.filter((x) => x.kind !== 'cash')
    const pool = kind === 'expense'
      ? [...snap.methods.map((x) => ({ ...x, transfer: false })), ...transfers.map((x) => ({ ...x, transfer: true }))]
      : snap.sources.map((x) => ({ ...x, transfer: false }))
    const rank = (sid: string) => (sid === spaceId ? 0 : sid === personal.id ? 1 : 2)
    return pool
      .sort((a, b) => rank(a.spaceId) - rank(b.spaceId))
      .map((x) => ({
        id: x.id, name: x.transfer ? t('bankTransfer', { s: x.name }) : x.name, spaceId: x.spaceId, transfer: x.transfer,
        personal: x.spaceId === personal.id && spaceId !== personal.id,
      }))
  }, [kind, snap.methods, snap.sources, spaceId, personal.id, t])

  const catId = cats.some((c) => c.id === categoryId) ? categoryId : (cats[0]?.id ?? null)
  const last = readLast()[`${spaceId}:${kind}`]
  const viaId = options.some((o) => o.id === via) ? via : (options.find((o) => o.id === last)?.id ?? options[0]?.id ?? null)
  const chosen = options.find((o) => o.id === viaId)
  const n = parseInt(amount, 10) || 0

  const press = (k: string) => {
    if (k === 'del') return setAmount((a) => (a.length > 1 ? a.slice(0, -1) : '0'))
    setAmount((a) => {
      const next = a === '0' ? (k === '00' ? '0' : k) : a + k
      return next.length > 9 ? a : next
    })
  }

  const save = async () => {
    if (!n || !viaId) return
    const entry: NewEntry = {
      spaceId, kind, amount: n, categoryId: catId,
      methodId: kind === 'expense' && !chosen?.transfer ? viaId : null, sourceId: kind === 'income' || chosen?.transfer ? viaId : null,
      occurredOn: date, name: name.trim(), note: note.trim(), tags: tags.split(/[,、，]/).map((s) => s.trim()).filter(Boolean),
      repeat: base?.repeatOf ? 'none' : repeat, repeatOf: base?.repeatOf ?? null,
    }
    try {
      localStorage.setItem(LAST_VIA, JSON.stringify({ ...readLast(), [`${spaceId}:${kind}`]: viaId }))
    } catch {
      /* ignore */
    }
    const before = streak(snap.entries, snap.noSpendDays, snap.me.id, today)
    const msg = editId ? t('saved')
      : date === today && !before.doneToday ? t('loggedStreak', { n: before.count + 1 })
      : t('loggedTo', { a: yen(n), s: target.name })
    ui.close()
    await act((r) => (editId ? r.updateEntry(editId, entry) : r.addEntries([entry])), msg, {
      flame: !editId && date === today && !before.doneToday,
    })
  }

  return (
    <>
      <div className="seg" role="group">
        <button aria-pressed={kind === 'expense'} onClick={() => setKind('expense')}>{t('expense')}</button>
        <button aria-pressed={kind === 'income'} onClick={() => setKind('income')}>{t('incomeT')}</button>
      </div>
      <div className={'amount-disp num' + (n ? '' : ' zero')} aria-live="polite">{kind === 'income' ? '+' : ''}{yen(n)}</div>

      {/* label on the left, choices scroll sideways on the right */}
      <div className="picks">
        <div className="pick">
          <label className="pick-l" htmlFor="entry-name">{t('name')}</label>
          <input id="entry-name" className="input" value={name} maxLength={60} placeholder={t('optional')} onChange={(e) => setName(e.target.value)} />
        </div>
        {!editId && snap.spaces.length > 1 && (
          <div className="pick">
            <label className="pick-l" htmlFor="entry-space">{t('saveTo')}</label>
            <Select id="entry-space" value={spaceId} onChange={setSpaceId}
              options={snap.spaces.map((s) => ({ value: s.id, label: s.name, icon: <Dot color={toneVar(s)} round /> }))} />
          </div>
        )}
        <div className="pick">
          <label className="pick-l" htmlFor="entry-cat">{t('category')}</label>
          <Select id="entry-cat" value={catId ?? ''} onChange={setCategoryId} placeholder="—"
            options={cats.map((c) => ({ value: c.id, label: c.name, icon: <Dot color={c.color} /> }))}
            onNew={() => ui.push(<CategorySheet spaceId={spaceId} kind={kind} onSaved={setCategoryId} />, toneVar(target))} newLabel={t('newCat')} />
        </div>
        <div className="pick">
          <label className="pick-l" htmlFor="entry-via">{kind === 'income' ? t('into') : t('paidWith')}</label>
          <Select id="entry-via" value={viaId ?? ''} onChange={setVia} placeholder="—"
            options={options.map((o) => ({
              value: o.id, label: o.name, icon: o.personal ? <IconLock /> : undefined,
              hint: o.spaceId !== spaceId && !o.personal ? spaceName(o.spaceId) : undefined,
            }))}
            onNew={() => ui.push(kind === 'income'
              ? <SourceSheet spaceId={spaceId} onSaved={setVia} />
              : <MethodSheet spaceId={spaceId} onSaved={setVia} />, toneVar(target))}
            newLabel={kind === 'income' ? t('addSource') : t('addMethod')} />
        </div>
        {chosen?.personal && <span className="privacy">{t('hiddenHint')}</span>}
        {chosen && chosen.spaceId !== spaceId && !chosen.personal && <span className="privacy">{t('sharedHint')}</span>}
      </div>

      <div className="keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del'].map((k) => (
          <button key={k} onClick={() => press(k)} aria-label={k === 'del' ? 'Delete' : k}>{k === 'del' ? '⌫' : k}</button>
        ))}
      </div>

      <details open={!!editId}>
        <summary>{t('details')}</summary>
        <div className="stack">
          <div className="field">
            <label className="label" htmlFor="entry-note">{t('note')}</label>
            <input id="entry-note" value={note} maxLength={200} placeholder={t('notePh')} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="entry-date">{t('date')}</label>
            <div className="chips">
              <button className="chip" aria-pressed={date === today} onClick={() => setDate(today)}>{t('today')}</button>
              <button className="chip" aria-pressed={date === addDays(today, -1)} onClick={() => setDate(addDays(today, -1))}>{t('yesterday')}</button>
              <input id="entry-date" className="input" type="date" value={date} max={addDays(today, 365)} onChange={(e) => e.target.value && setDate(e.target.value)} style={{ width: 'auto' }} />
            </div>
          </div>
          {!base?.repeatOf && (
            <div className="field">
              <label className="label" htmlFor="entry-repeat">{t('repeat')}</label>
              <Select id="entry-repeat" value={repeat} onChange={(v) => setRepeat(v as Repeat)}
                options={(['none', 'weekly', 'biweekly', 'monthly', 'yearly'] as const).map((r) => ({ value: r, label: t(r === 'none' ? 'never' : r) }))} />
            </div>
          )}
          <div className="field">
            <label className="label" htmlFor="entry-tags">{t('tags')}</label>
            <input id="entry-tags" value={tags} placeholder={t('tagsPh')} onChange={(e) => setTags(e.target.value)} />
          </div>
        </div>
      </details>

      <button className="btn primary big" disabled={!n || !viaId} onClick={save}>
        {n ? t(editId ? 'saveX' : 'logX', { a: yen(n) }) : t('enterAmt')}
      </button>
    </>
  )
}
