import { useState } from 'react'
import { monthEntries } from '../domain/money'
import { addDays } from '../domain/dates'
import { useI18n, yen } from '../i18n'
import { useLookups, useStore } from '../data/store'
import { EntryRow } from '../ui/entry'
import { IconSearch } from '../ui/icons'
import type { MessageKey } from '../i18n/en'

type Filter = 'all' | 'expense' | 'income' | 'repeat' | 'tagged' | 'mine'

export function Activity() {
  const { snap, space, today } = useStore()
  const { cat } = useLookups()
  const { t, dateLong } = useI18n()
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')

  let list = snap.entries.filter((e) => e.spaceId === space.id && e.occurredOn <= today)
  if (filter === 'expense') list = list.filter((e) => e.kind === 'expense')
  if (filter === 'income') list = list.filter((e) => e.kind === 'income')
  if (filter === 'repeat') list = list.filter((e) => e.repeat !== 'none' || e.repeatOf)
  if (filter === 'tagged') list = list.filter((e) => e.tags.length)
  if (filter === 'mine') list = list.filter((e) => e.createdBy === snap.me.id)
  const needle = q.trim().toLowerCase()
  if (needle) {
    list = list.filter((e) =>
      [e.note, e.categoryId ? cat.get(e.categoryId)?.name : '', e.tags.join(' '), String(e.amount)].join(' ').toLowerCase().includes(needle),
    )
  }
  const groups = new Map<string, typeof list>()
  for (const e of list.sort((a, b) => (a.occurredOn < b.occurredOn ? 1 : -1))) {
    const g = groups.get(e.occurredOn) ?? []
    g.push(e)
    groups.set(e.occurredOn, g)
  }
  const out = monthEntries(snap.entries, space.id, today).reduce((a, e) => a + e.amount, 0)
  const inc = monthEntries(snap.entries, space.id, today, 'income').reduce((a, e) => a + e.amount, 0)
  const filters: [Filter, MessageKey][] = [['all', 'fAll'], ['expense', 'fSpent'], ['income', 'fIncome'], ['repeat', 'fRepeat'], ['tagged', 'fTagged']]
  if (space.kind === 'household') filters.push(['mine', 'fMine'])
  const yesterday = addDays(today, -1)

  return (
    <>
      <div className="card" style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}><div className="label">{t('monthOut')}</div><div className="num" style={{ fontSize: 18 }}>{yen(out)}</div></div>
        <div style={{ flex: 1, minWidth: 0 }}><div className="label">{t('monthIn')}</div><div className="num amt-in" style={{ fontSize: 18 }}>{yen(inc)}</div></div>
        <div style={{ flex: 1, minWidth: 0 }}><div className="label">{t('net')}</div><div className="num" style={{ fontSize: 18 }}>{yen(inc - out)}</div></div>
      </div>
      <label className="search">
        <IconSearch />
        <input id="activity-search" placeholder={t('search')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('search')} />
      </label>
      <div className="chips">
        {filters.map(([k, l]) => (
          <button key={k} className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>{t(l)}</button>
        ))}
      </div>
      {groups.size ? (
        [...groups].map(([d, es]) => {
          const sum = es.filter((e) => e.kind === 'expense').reduce((a, e) => a + e.amount, 0)
          return (
            <section key={d} style={{ display: 'contents' }}>
              <div className="day-h">
                <span>{d === today ? t('today') : d === yesterday ? t('yesterday') : dateLong(d)}</span>
                <span className="num">{sum ? '-' + yen(sum) : ''}</span>
              </div>
              <div className="card list">{es.map((e) => <EntryRow key={e.id} entry={e} />)}</div>
            </section>
          )
        })
      ) : (
        <div className="card empty">{t('noMatch')}</div>
      )}
    </>
  )
}
