import { useMemo, useState } from 'react'
import { addDays } from '../domain/dates'
import { streak } from '../domain/streak'
import type { EntryKind, NewEntry, Repeat } from '../domain/types'
import { useI18n, yen } from '../i18n'
import { toneVar, useStore } from '../data/store'
import { CategorySheet } from './CategorySheet'
import { IconLock } from '../ui/icons'
import { useUI } from '../ui/ui'

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
  const [via, setVia] = useState<string | null>((init.kind === 'income' ? init.sourceId : init.methodId) ?? null)
  const [note, setNote] = useState(init.note ?? '')
  const [tags, setTags] = useState((init.tags ?? []).join(', '))
  const [date, setDate] = useState(init.occurredOn ?? today)
  const [repeat, setRepeat] = useState<Repeat>(base?.repeat ?? 'none')

  const target = snap.spaces.find((s) => s.id === spaceId) ?? space
  const cats = snap.categories.filter((c) => c.spaceId === spaceId && c.kind === kind)
  const spaceName = (id: string) => snap.spaces.find((s) => s.id === id)?.name ?? ''

  // Any method/source from a space I belong to. The target space's own first, then mine, then other households.
  const options = useMemo(() => {
    const pool = kind === 'expense' ? snap.methods : snap.sources
    const rank = (sid: string) => (sid === spaceId ? 0 : sid === personal.id ? 1 : 2)
    return [...pool]
      .sort((a, b) => rank(a.spaceId) - rank(b.spaceId))
      .map((x) => ({ id: x.id, name: x.name, spaceId: x.spaceId, personal: x.spaceId === personal.id && spaceId !== personal.id }))
  }, [kind, snap.methods, snap.sources, spaceId, personal.id])

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
      methodId: kind === 'expense' ? viaId : null, sourceId: kind === 'income' ? viaId : null,
      occurredOn: date, note: note.trim(), tags: tags.split(/[,、，]/).map((s) => s.trim()).filter(Boolean),
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

      {!editId && snap.spaces.length > 1 && (
        <div className="field">
          <span className="label">{t('saveTo')}</span>
          <div className="chips">
            {snap.spaces.map((s) => (
              <button key={s.id} className="chip" aria-pressed={spaceId === s.id} onClick={() => setSpaceId(s.id)}>
                <span className="sw" style={{ background: toneVar(s), borderRadius: '50%' }} />{s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="chips" aria-label={t('category')}>
        {cats.map((c) => (
          <button key={c.id} className="chip" aria-pressed={catId === c.id} onClick={() => setCategoryId(c.id)}>
            <span className="sw" style={{ background: c.color }} />{c.name}
          </button>
        ))}
        <button className="chip" onClick={() => ui.open(<CategorySheet spaceId={spaceId} kind={kind} />, toneVar(target))}>{t('newShort')}</button>
      </div>

      <div className="field">
        <span className="label">{kind === 'income' ? t('into') : t('paidWith')}</span>
        {options.length ? (
          <div className="chips">
            {options.map((o) => (
              <button key={o.id} className="chip" aria-pressed={viaId === o.id} onClick={() => setVia(o.id)}>
                {o.personal && <IconLock />}
                {o.name}
                {o.spaceId !== spaceId && !o.personal && <span className="tag">{spaceName(o.spaceId)}</span>}
              </button>
            ))}
          </div>
        ) : (
          <span className="privacy">{kind === 'income' ? t('noSourceHint') : t('noMethodHint')}</span>
        )}
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
              <select id="entry-repeat" value={repeat} onChange={(e) => setRepeat(e.target.value as Repeat)}>
                {(['none', 'weekly', 'biweekly', 'monthly', 'yearly'] as const).map((r) => (
                  <option key={r} value={r}>{t(r === 'none' ? 'never' : r)}</option>
                ))}
              </select>
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
