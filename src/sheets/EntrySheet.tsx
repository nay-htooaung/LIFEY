import { useMemo, useState } from 'react'
import { addDays } from '../domain/dates'
import { asNew, isTemplate, nextOccurrence, scheduleChange, type ScheduleChange } from '../domain/recurring'
import type { Entry, EntryKind, MoneyKind, NewEntry, Repeat } from '../domain/types'
import type { Repo } from '../data/repo'
import { useI18n, yen } from '../i18n'
import { toneVar, useStore, useSubmit } from '../data/store'
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
  /** Edit this one entry. A repeating entry's schedule is left as it is. */
  editId?: string
  /** Edit this repeating entry's schedule from its next date on; past records stay as they are. */
  scheduleOf?: string
  prefill?: Partial<NewEntry>
  /** Returns the entry instead of saving it (adjusting a change the assistant proposed). */
  onDraft?: (entry: NewEntry) => void
}

/** Carries out a schedule change: drop replaced copies, end or rewrite the old template, add the new one. */
async function runSchedule(r: Repo, template: Entry, plan: ScheduleChange) {
  for (const id of plan.remove) await r.deleteEntry(id)
  if (plan.end) await r.updateEntry(template.id, { ...asNew(template), repeat: 'none' })
  if (plan.update) await r.updateEntry(template.id, plan.update)
  if (plan.add) await r.addEntries([plan.add])
}

export function EntrySheet({ editId, scheduleOf, prefill, onDraft }: Props) {
  const { snap, space, personal, today } = useStore()
  const { submit, pending } = useSubmit()
  const ui = useUI()
  const { t } = useI18n()
  const series = scheduleOf ? snap.entries.find((e) => e.id === scheduleOf) : undefined
  const base = editId ? snap.entries.find((e) => e.id === editId) : series
  // a schedule is edited from its next date; a schedule that has not started yet from its first
  const nextDate = series ? (series.occurredOn > today ? series.occurredOn : nextOccurrence(series, today)) : null
  const init = { ...base, ...(nextDate ? { occurredOn: nextDate } : {}), ...prefill }
  // Repeat is set on new entries, one-offs being edited, and schedules; one record of a series cannot change it
  const canRepeat = !!scheduleOf || !base || (base.repeat === 'none' && !base.repeatOf)

  const [kind, setKind] = useState<EntryKind>(init.kind ?? 'expense')
  const [amount, setAmount] = useState(init.amount ? String(init.amount) : '0')
  const [spaceId, setSpaceId] = useState(init.spaceId ?? space.id)
  const [categoryId, setCategoryId] = useState<string | null>(init.categoryId ?? null)
  // expense: a method or a source; income: a source; transfer: the source it leaves, or a credit card charging e-money
  const [via, setVia] = useState<string | null>((init.kind === 'income' || !init.methodId ? init.sourceId : init.methodId) ?? null)
  const [toVia, setToVia] = useState<string | null>(init.toSourceId ?? null)
  const [fee, setFee] = useState(init.fee ? String(init.fee) : '0')
  // which number the keypad types into; only transfers have a second one
  const [field, setField] = useState<'amount' | 'fee'>('amount')
  const [name, setName] = useState(init.name ?? '')
  const [note, setNote] = useState(init.note ?? '')
  const [tags, setTags] = useState((init.tags ?? []).join(', '))
  const [date, setDate] = useState(init.occurredOn ?? today)
  const [repeat, setRepeat] = useState<Repeat>(base?.repeat ?? 'none')

  const target = snap.spaces.find((s) => s.id === spaceId) ?? space
  const cats = kind === 'transfer' ? [] : snap.categories.filter((c) => c.spaceId === spaceId && c.kind === kind)
  const spaceName = (id: string) => snap.spaces.find((s) => s.id === id)?.name ?? ''

  // Any method/source from a space I belong to. The target space's own first, then mine, then other spaces.
  // Expenses can be paid with a method or straight from a source, listed by name like the rest.
  // Transfers leave a source, or a credit card when charging e-money.
  const options = useMemo(() => {
    // deleted ones only when this entry already uses them, so editing never switches its payment silently
    const live = <T extends { id: string; archived: boolean }>(xs: T[]) => xs.filter((x) => !x.archived || x.id === via || x.id === toVia)
    const sources = live(snap.sources).map((x) => ({ ...x, isSource: true }))
    const methods = live(snap.methods).filter((x) => kind === 'expense' || (kind === 'transfer' && x.kind === 'credit'))
    const pool = kind === 'income' ? sources : kind === 'expense' ? [...methods.map((x) => ({ ...x, isSource: false })), ...sources]
      : [...sources, ...methods.map((x) => ({ ...x, isSource: false }))]
    const rank = (sid: string) => (sid === spaceId ? 0 : sid === personal.id ? 1 : 2)
    return pool
      .sort((a, b) => rank(a.spaceId) - rank(b.spaceId))
      .map((x) => ({ id: x.id, name: x.name, kind: x.kind, spaceId: x.spaceId, isSource: x.isSource, personal: x.spaceId === personal.id && spaceId !== personal.id }))
  }, [kind, snap.methods, snap.sources, spaceId, personal.id, via, toVia])

  const catId = cats.some((c) => c.id === categoryId) ? categoryId : (cats[0]?.id ?? null)
  const lastUsed = readLast()
  const pickFrom = <T extends { id: string }>(xs: T[], want: string | null, remembered?: string) =>
    xs.some((o) => o.id === want) ? want : (xs.find((o) => o.id === remembered)?.id ?? xs[0]?.id ?? null)
  // income lands in my cash unless picked otherwise; the rest start where I last logged them
  const cash = snap.sources.find((s) => s.fixed && s.spaceId === personal.id)?.id
  const viaId = pickFrom(options, via, kind === 'income' ? cash : lastUsed[`${spaceId}:${kind}`])
  const chosen = options.find((o) => o.id === viaId)
  // a card can only charge e-money; money never moves into a card
  const toOptions = kind === 'transfer' ? options.filter((o) => o.isSource && o.id !== viaId && (chosen?.isSource || o.kind === 'emoney')) : []
  const toId = pickFrom(toOptions, toVia, lastUsed[`${spaceId}:transfer-to`])
  const n = parseInt(amount, 10) || 0
  const feeN = kind === 'transfer' ? parseInt(fee, 10) || 0 : 0
  const typing = kind === 'transfer' ? field : 'amount'

  const press = (k: string) => {
    const set = typing === 'fee' ? setFee : setAmount
    if (k === 'del') return set((a) => (a.length > 1 ? a.slice(0, -1) : '0'))
    set((a) => {
      const next = a === '0' ? (k === '00' ? '0' : k) : a + k
      return next.length > 9 ? a : next
    })
  }
  const switchKind = (k: EntryKind) => {
    setKind(k)
    setField('amount')
  }

  const ready = !!n && !!viaId && (kind !== 'transfer' || !!toId)
  const save = async () => {
    if (!ready) return
    const transfer = kind === 'transfer'
    const entry: NewEntry = {
      spaceId, kind, amount: n, categoryId: transfer ? null : catId,
      methodId: kind !== 'income' && !chosen?.isSource ? viaId : null, sourceId: kind === 'income' || chosen?.isSource ? viaId : null,
      toSourceId: transfer ? toId : null, fee: feeN,
      occurredOn: date, name: name.trim(), note: note.trim(), tags: tags.split(/[,、，]/).map((s) => s.trim()).filter(Boolean),
      repeat: canRepeat || (base && isTemplate(base)) ? repeat : 'none', repeatOf: series ? null : (base?.repeatOf ?? null),
    }
    if (onDraft) {
      onDraft(entry)
      ui.close()
      return
    }
    try {
      localStorage.setItem(LAST_VIA, JSON.stringify({ ...readLast(), [`${spaceId}:${kind}`]: viaId, ...(transfer ? { [`${spaceId}:transfer-to`]: toId } : {}) }))
    } catch {
      /* ignore */
    }
    const toName = options.find((o) => o.id === toId)?.name ?? ''
    if (series) {
      const next = repeat === 'none' ? null : { ...entry, repeat, repeatOf: null }
      await submit('save', (r) => runSchedule(r, series, scheduleChange(series, snap.entries, today, next)),
        t(next ? 'scheduleSaved' : 'scheduleStopped'), { close: true })
      return
    }
    if (base && isTemplate(base) && base.occurredOn <= today) {
      // one record of a running schedule: split the schedule off first, so the edit stays on this record only
      const carryOn = { ...asNew(base), occurredOn: nextOccurrence(base, today)! }
      await submit('save', async (r) => {
        await runSchedule(r, base, scheduleChange(base, snap.entries, today, carryOn))
        await r.updateEntry(base.id, { ...entry, repeat: 'none', repeatOf: null })
      }, t('saved'), { close: true })
      return
    }
    await submit('save', (r) => (editId ? r.updateEntry(editId, entry) : r.addEntries([entry])),
      editId ? t('saved') : transfer ? t('movedTo', { a: yen(n), s: toName }) : t('loggedTo', { a: yen(n), s: target.name }), { close: true })
  }

  return (
    <>
      {series && (
        <div>
          <h2>{t('editSchedule')}</h2>
        </div>
      )}
      <div className="seg" role="group">
        <button aria-pressed={kind === 'expense'} onClick={() => switchKind('expense')}>{t('expense')}</button>
        <button aria-pressed={kind === 'income'} onClick={() => switchKind('income')}>{t('incomeT')}</button>
        <button aria-pressed={kind === 'transfer'} onClick={() => switchKind('transfer')}>{t('transfer')}</button>
      </div>
      {kind === 'transfer' ? (
        // two numbers, one keypad: tap a number to type into it; the one being typed is outlined
        <div className="amounts">
          <button className={'amount-disp num' + (n ? '' : ' zero')} aria-pressed={typing === 'amount'} aria-live="polite"
            aria-label={`${t('amountLabel')} ${yen(n)}`} onClick={() => setField('amount')}>{yen(n)}</button>
          <button className={'fee-pill num' + (feeN ? ' set' : '')} aria-pressed={typing === 'fee'} onClick={() => setField('fee')}>
            {feeN || typing === 'fee' ? `${t('fee')} ${yen(feeN)}` : t('addFee')}
          </button>
        </div>
      ) : (
        <div className={'amount-disp num' + (n ? '' : ' zero')} aria-live="polite">{kind === 'income' ? '+' : ''}{yen(n)}</div>
      )}

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
        {kind !== 'transfer' && <div className="pick">
          <label className="pick-l" htmlFor="entry-cat">{t('category')}</label>
          <Select id="entry-cat" value={catId ?? ''} onChange={setCategoryId} placeholder="—"
            options={cats.map((c) => ({ value: c.id, label: c.name, icon: <Dot color={c.color} /> }))}
            onNew={() => ui.push(<CategorySheet spaceId={spaceId} kind={kind as MoneyKind} onSaved={setCategoryId} />, toneVar(target))} newLabel={t('newCat')} />
        </div>}
        <div className="pick">
          <label className="pick-l" htmlFor="entry-via">{kind === 'income' ? t('into') : kind === 'transfer' ? t('transferFrom') : t('paidWith')}</label>
          <Select id="entry-via" value={viaId ?? ''} onChange={setVia} placeholder="—"
            options={options.map((o) => ({
              value: o.id, label: o.name, icon: o.personal ? <IconLock /> : undefined,
              hint: o.spaceId !== spaceId && !o.personal ? spaceName(o.spaceId) : undefined,
            }))}
            onNew={() => ui.push(kind === 'expense'
              ? <MethodSheet spaceId={spaceId} onSaved={setVia} />
              : <SourceSheet spaceId={spaceId} onSaved={setVia} />, toneVar(target))}
            newLabel={kind === 'expense' ? t('addMethod') : t('addSource')} />
        </div>
        {kind === 'transfer' && (
          <div className="pick">
            <label className="pick-l" htmlFor="entry-to">{t('transferTo')}</label>
            <Select id="entry-to" value={toId ?? ''} onChange={setToVia} placeholder="—"
              options={toOptions.map((o) => ({
                value: o.id, label: o.name, icon: o.personal ? <IconLock /> : undefined,
                hint: o.spaceId !== spaceId && !o.personal ? spaceName(o.spaceId) : undefined,
              }))}
              onNew={() => ui.push(<SourceSheet spaceId={spaceId} onSaved={setToVia} />, toneVar(target))} newLabel={t('addSource')} />
          </div>
        )}
      </div>

      <div className="keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del'].map((k) => (
          <button key={k} onClick={() => press(k)} aria-label={k === 'del' ? 'Delete' : k}>{k === 'del' ? '⌫' : k}</button>
        ))}
      </div>

      <details open={!!editId || !!series}>
        <summary>{t('details')}</summary>
        <div className="stack">
          <div className="field">
            <label className="label" htmlFor="entry-note">{t('note')}</label>
            <input id="entry-note" value={note} maxLength={200} placeholder={t('notePh')} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="entry-date">{series ? t('nextDate') : t('date')}</label>
            <div className="chips">
              <button className="chip" aria-pressed={date === today} onClick={() => setDate(today)}>{t('today')}</button>
              <button className="chip" aria-pressed={date === addDays(today, -1)} onClick={() => setDate(addDays(today, -1))}>{t('yesterday')}</button>
              <input id="entry-date" className="input" type="date" value={date} max={addDays(today, 365)} onChange={(e) => e.target.value && setDate(e.target.value)} style={{ width: 'auto' }} />
            </div>
          </div>
          {canRepeat && (
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

      <button className="btn primary big" disabled={!ready || !!pending} aria-busy={pending === 'save'} onClick={save}>
        {series && repeat === 'none' ? t('stopRepeat') : !n ? t('enterAmt') : onDraft ? t('useDraft') : series ? t('saveSchedule') : editId ? t('saveX', { a: yen(n) }) : kind === 'transfer' ? t('moveX', { a: yen(n + feeN) }) : t('logX', { a: yen(n) })}
      </button>
    </>
  )
}
