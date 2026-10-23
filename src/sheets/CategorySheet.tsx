import { useState } from 'react'
import type { Category, EntryKind } from '../domain/types'
import { useI18n } from '../i18n'
import { useStore } from '../data/store'
import { parseYen, SWATCHES } from '../ui/bits'
import { useUI } from '../ui/ui'

interface Props {
  category?: Category
  spaceId?: string
  kind?: EntryKind
  /** Called with the new or edited category's id once saved. */
  onSaved?: (id: string) => void
}

export function CategorySheet({ category, spaceId, kind: initialKind, onSaved }: Props) {
  const { snap, space, act } = useStore()
  const ui = useUI()
  const { t } = useI18n()
  const target = snap.spaces.find((s) => s.id === (category?.spaceId ?? spaceId)) ?? space
  const [name, setName] = useState(category?.name ?? '')
  const [color, setColor] = useState(category?.color ?? SWATCHES[0])
  const [kind, setKind] = useState<EntryKind>(category?.kind ?? initialKind ?? 'expense')
  const [budget, setBudget] = useState(category?.monthlyBudget ? String(category.monthlyBudget) : '')
  const [confirm, setConfirm] = useState(false)

  const save = async () => {
    const n = name.trim()
    if (!n) return document.getElementById('cat-name')?.focus()
    const sort = category?.sort ?? snap.categories.filter((c) => c.spaceId === target.id).length + 1
    ui.close()
    const id = await act(
      (r) => r.saveCategory({ id: category?.id, spaceId: target.id, name: n, color, kind, monthlyBudget: kind === 'expense' ? parseYen(budget) : 0, sort }),
      category ? t('saved') : t('created', { x: n }),
    )
    if (id) onSaved?.(id)
  }

  return (
    <>
      <h2>{category ? t('catEdit') : t('catTitle')}</h2>
      <p className="lead">{t('catFor', { s: target.name })}</p>
      <div className="field">
        <label className="label" htmlFor="cat-name">{t('name')}</label>
        <input id="cat-name" value={name} maxLength={40} placeholder={t('catPh')} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <span className="label">{t('colour')}</span>
        <div className="swatches">
          {SWATCHES.map((c) => (
            <button key={c} style={{ background: c }} aria-label={c} aria-pressed={c === color} onClick={() => setColor(c)} />
          ))}
        </div>
      </div>
      <div className="two">
        <div className="field">
          <label className="label" htmlFor="cat-kind">{t('type')}</label>
          <select id="cat-kind" value={kind} disabled={!!category} onChange={(e) => setKind(e.target.value as EntryKind)}>
            <option value="expense">{t('expense')}</option>
            <option value="income">{t('incomeT')}</option>
          </select>
        </div>
        {kind === 'expense' && (
          <div className="field">
            <label className="label" htmlFor="cat-budget">{t('monthlyBudget')}</label>
            <input id="cat-budget" inputMode="numeric" value={budget} placeholder={t('optional')} onChange={(e) => setBudget(e.target.value)} />
          </div>
        )}
      </div>
      <button className="btn primary big" onClick={save}>{category ? t('save') : t('create')}</button>
      {category && (
        <button
          className="btn danger"
          onClick={() => {
            if (!confirm) return setConfirm(true)
            ui.close()
            void act((r) => r.archiveCategory(category.id), t('archived', { x: category.name }))
          }}
        >
          {confirm ? t('confirmDel') : t('archive')}
        </button>
      )}
    </>
  )
}
