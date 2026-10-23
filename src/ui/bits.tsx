import type { Category, Profile } from '../domain/types'

export function Glyph({ category }: { category?: Pick<Category, 'name' | 'color'> }) {
  const first = category ? [...category.name][0] ?? '•' : '•'
  return <span className="glyph" style={{ background: category?.color ?? 'var(--card-2)' }}>{first}</span>
}

export function Avatar({ profile, label }: { profile?: Profile; label?: string }) {
  const name = label ?? profile?.displayName ?? '?'
  return <span className="av" style={{ background: profile?.color ?? 'var(--muted)' }} title={name}>{[...name][0]?.toUpperCase()}</span>
}

export function SpaceDot({ name, tone, large }: { name: string; tone: string; large?: boolean }) {
  return <span className={'sd' + (large ? ' lg' : '')} style={{ background: `var(--tone-${tone})` }}>{[...name][0]}</span>
}

export const SWATCHES = ['#2F8F7F', '#D0704B', '#4A7FC4', '#B05AAA', '#D3A42A', '#6A9C36', '#8A6AD8', '#C2566E', '#3F9AB0', '#9C7A50']

/** Accepts "12,800", "１２８００" or "¥12800". */
export const parseYen = (s: string) => {
  const half = s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
  return parseInt(half.replace(/[^\d-]/g, ''), 10) || 0
}
