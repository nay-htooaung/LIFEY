// Proposals that change the setup rather than entries: categories, sources, payment methods, spaces, the profile
// and repeating schedules. Each is checked here the way the app's own sheets check it, and carries how to apply it
// and, where the app allows, how to undo it. Nothing runs until the person applies the tray.
import { isPhoto } from '../ui/photo'
import type { Change } from '../domain/changes'
import { isTemplate, nextOccurrence, scheduleChange } from '../domain/recurring'
import type { Category, Entry, MethodKind, NewEntry, PaymentMethod, Pot, Profile, Snapshot, Source, SourceKind, Space, Theme, Tone } from '../domain/types'
import { runSchedule, type Repo } from '../data/repo'
import type { I18n } from '../i18n'
import { yen } from '../i18n'
import { CHARACTERS } from '../ui/characters'
import { SWATCHES } from '../ui/bits'

export type SetupWhat = 'category' | 'source' | 'method' | 'space' | 'profile' | 'schedule' | 'pot' | 'pot_move'
/** How the tray shows it: a new thing, a change, a removal, or a restored one. */
export type SetupTone = 'add' | 'edit' | 'delete' | 'restore'
export type Undo = ((r: Repo) => Promise<void>) | null

export interface SetupChange {
  key: string
  op: 'setup'
  what: SetupWhat
  tone: SetupTone
  title: string
  detail: string
  /** A thing this creates, with the placeholder id (new:…) that later proposals may use until it exists. */
  draft?: Category | Source | PaymentMethod | Space | Pot
  /** Applies it; `id` turns a placeholder into the real id. Returns the real id of what it created and how to undo it. */
  run(r: Repo, id: (x: string) => string): Promise<{ created?: string; undo: Undo }>
}

/** Everything that can sit in the tray. */
export type Proposal = Change | SetupChange

export interface SetupCtx {
  snap: Snapshot
  space: Space
  today: string
  t: I18n['t']
  /** The tray so far, so a proposal can use what an earlier one creates. */
  tray: Proposal[]
}

type Args = Record<string, unknown>
let nextKey = 1
const newKey = () => `s${nextKey++}`

/** The snapshot's lists plus what the tray will create. */
export function world(c: Pick<SetupCtx, 'snap' | 'tray'>) {
  const drafts = c.tray.flatMap((p) => (p.op === 'setup' && p.draft ? [p] : []))
  const of = <T,>(what: SetupWhat) => drafts.filter((p) => p.what === what).map((p) => p.draft as T)
  return {
    spaces: [...c.snap.spaces, ...of<Space>('space')],
    sources: [...c.snap.sources, ...of<Source>('source')],
    methods: [...c.snap.methods, ...of<PaymentMethod>('method')],
    categories: [...c.snap.categories, ...of<Category>('category')],
    pots: [...c.snap.pots, ...of<Pot>('pot')],
  }
}

const str = (a: Args, k: string) => (typeof a[k] === 'string' ? (a[k] as string).trim() : undefined)
const has = (a: Args, k: string) => a[k] !== undefined && a[k] !== null
/** A call that came without its id: say so plainly, so the model sends the whole call again. */
const missing = (field: string) => `${field} is missing. Call again with every argument: action, ${field} and the fields that change.`
const whole = (v: unknown) => Number.isInteger(v) && (v as number) >= 0
/** Field changes, "Name: A → B", for the tray. */
const diff = (pairs: [string, unknown, unknown][]) =>
  pairs.filter(([, a, b]) => a !== b).map(([label, a, b]) => `${label}: ${a ?? '—'} → ${b ?? '—'}`).join(' · ')

const TONES: Tone[] = ['me', 'a', 'b', 'c', 'd']
const THEMES: Theme[] = ['midnight', 'light', 'milky']

export function proposeCategory(a: Args, c: SetupCtx): SetupChange | string {
  const { t } = c
  const w = world(c)
  const action = str(a, 'action')
  const name = str(a, 'name')
  const color = str(a, 'color')
  if (color && !/^#[0-9a-f]{6}$/i.test(color)) return 'color must be #RRGGBB'
  if (has(a, 'monthly_budget') && !whole(a.monthly_budget)) return 'monthly_budget must be a whole number of yen, 0 or more'
  if (name !== undefined && (!name || name.length > 30)) return 'name must be 1-30 characters'
  const key = newKey()
  if (action === 'create') {
    const spaceId = str(a, 'space_id') ?? c.space.id
    if (!w.spaces.some((s) => s.id === spaceId)) return 'unknown space_id'
    if (!name) return 'name is required'
    const kind = a.kind === 'income' ? 'income' : 'expense'
    const mine = w.categories.filter((k) => k.spaceId === spaceId)
    const draft: Category = {
      id: `new:${key}`, spaceId, name, kind, color: color ?? SWATCHES[mine.length % SWATCHES.length],
      monthlyBudget: kind === 'expense' ? ((a.monthly_budget as number) ?? 0) : 0, sort: Math.max(0, ...mine.map((k) => k.sort)) + 1,
    }
    return {
      key, op: 'setup', what: 'category', tone: 'add', title: name, draft,
      detail: [t('category'), kind === 'income' ? t('incomeT') : t('expense'), draft.monthlyBudget ? `${t('monthlyBudget')} ${yen(draft.monthlyBudget)}` : ''].filter(Boolean).join(' · '),
      async run(r, id) {
        const created = await r.saveCategory({ ...draft, id: undefined, spaceId: id(spaceId) })
        return { created, undo: (r2) => r2.archiveCategory(created) }
      },
    }
  }
  if (!has(a, 'category_id')) return missing('category_id')
  const before = c.snap.categories.find((k) => k.id === a.category_id)
  if (!before) return 'unknown category_id'
  if (action === 'update') {
    const after: Category = {
      ...before, name: name ?? before.name, color: color ?? before.color,
      monthlyBudget: before.kind === 'expense' && has(a, 'monthly_budget') ? (a.monthly_budget as number) : before.monthlyBudget,
    }
    const detail = diff([[t('name'), before.name, after.name], [t('monthlyBudget'), yen(before.monthlyBudget), yen(after.monthlyBudget)], [t('colour'), before.color, after.color]])
    if (!detail) return 'nothing changes'
    return {
      key, op: 'setup', what: 'category', tone: 'edit', title: before.name, detail: `${t('category')} · ${detail}`,
      async run(r) {
        await r.saveCategory(after)
        return { undo: async (r2) => void (await r2.saveCategory(before)) }
      },
    }
  }
  if (action === 'delete') {
    return {
      key, op: 'setup', what: 'category', tone: 'delete', title: before.name, detail: t('category'),
      async run(r) {
        await r.archiveCategory(before.id)
        // categories cannot be restored
        return { undo: null }
      },
    }
  }
  return 'action must be create, update or delete'
}

export function proposeSource(a: Args, c: SetupCtx): SetupChange | string {
  const { t, snap } = c
  const w = world(c)
  const action = str(a, 'action')
  const name = str(a, 'name')
  const kind = a.kind as SourceKind | undefined
  if (kind && !['bank', 'cash', 'emoney'].includes(kind)) return 'kind must be bank, cash or emoney'
  if (has(a, 'opening_balance') && !Number.isInteger(a.opening_balance)) return 'opening_balance must be a whole number of yen'
  if (name !== undefined && (!name || name.length > 40)) return 'name must be 1-40 characters'
  const kindName = (k: SourceKind) => t(k === 'bank' ? 'bank' : k === 'cash' ? 'cash' : 'emoney')
  const key = newKey()
  if (action === 'create') {
    const spaceId = str(a, 'space_id') ?? c.space.id
    if (!w.spaces.some((s) => s.id === spaceId)) return 'unknown space_id'
    if (!name) return 'name is required'
    const draft: Source = {
      id: `new:${key}`, spaceId, name, kind: kind ?? 'bank', openingBalance: (a.opening_balance as number) ?? 0, createdOn: c.today, archived: false, fixed: false,
    }
    return {
      key, op: 'setup', what: 'source', tone: 'add', title: name, draft,
      detail: [t('sources'), kindName(draft.kind), `${t('balance')} ${yen(draft.openingBalance)}`].join(' · '),
      async run(r, id) {
        const created = await r.addSource({ spaceId: id(spaceId), name, kind: draft.kind, openingBalance: draft.openingBalance })
        return { created, undo: (r2) => r2.setSourceArchived(created, true) }
      },
    }
  }
  if (!has(a, 'source_id')) return missing('source_id')
  const before = snap.sources.find((s) => s.id === a.source_id)
  if (!before) return 'unknown source_id'
  const plain = { spaceId: before.spaceId, name: before.name, kind: before.kind, openingBalance: before.openingBalance }
  if (action === 'update') {
    if (before.fixed && ((name && name !== before.name) || (kind && kind !== before.kind))) return 'the fixed cash source keeps its name and kind; only its balance can change'
    const after = { ...plain, name: name ?? before.name, kind: kind ?? before.kind, openingBalance: has(a, 'opening_balance') ? (a.opening_balance as number) : before.openingBalance }
    const detail = diff([[t('name'), before.name, after.name], [t('type'), kindName(before.kind), kindName(after.kind)], [t('openingBalance'), yen(before.openingBalance), yen(after.openingBalance)]])
    if (!detail) return 'nothing changes'
    return {
      key, op: 'setup', what: 'source', tone: 'edit', title: before.name, detail: `${t('sources')} · ${detail}`,
      async run(r) {
        await r.updateSource(before.id, after)
        return { undo: (r2) => r2.updateSource(before.id, plain) }
      },
    }
  }
  if (action === 'delete') {
    if (before.fixed) return 'the fixed cash source cannot be deleted'
    if (before.archived) return 'already deleted'
    const users = snap.methods.filter((m) => !m.archived && m.sourceId === before.id)
    if (users.length) return `payment methods are paid from it (${users.map((m) => m.name).join(', ')}); delete or move those first`
    return {
      key, op: 'setup', what: 'source', tone: 'delete', title: before.name, detail: t('sources'),
      async run(r) {
        await r.setSourceArchived(before.id, true)
        return { undo: (r2) => r2.setSourceArchived(before.id, false) }
      },
    }
  }
  if (action === 'restore') {
    if (!before.archived) return 'it is not deleted'
    return {
      key, op: 'setup', what: 'source', tone: 'restore', title: before.name, detail: t('sources'),
      async run(r) {
        await r.setSourceArchived(before.id, false)
        return { undo: (r2) => r2.setSourceArchived(before.id, true) }
      },
    }
  }
  return 'action must be create, update, delete or restore'
}

export function proposeMethod(a: Args, c: SetupCtx): SetupChange | string {
  const { t, snap } = c
  const w = world(c)
  const action = str(a, 'action')
  const key = newKey()
  const kindName = (k: MethodKind) => t(k === 'credit' ? 'credit' : k === 'debit' ? 'debit' : 'cash')
  if (action !== 'create' && !has(a, 'method_id')) return missing('method_id')
  const before = action === 'create' ? undefined : snap.methods.find((m) => m.id === a.method_id)
  if (action !== 'create' && !before) return 'unknown method_id'

  if (action === 'delete' || action === 'restore') {
    const m = before!
    if (action === 'delete') {
      if (m.archived) return 'already deleted'
      const sharing = snap.methods.filter((x) => !x.archived && x.limitSharedWith === m.id)
      if (sharing.length) return `cards share its limit (${sharing.map((x) => x.name).join(', ')}); change those first`
    } else if (!m.archived) return 'it is not deleted'
    const del = action === 'delete'
    return {
      key, op: 'setup', what: 'method', tone: del ? 'delete' : 'restore', title: m.name, detail: t('methods'),
      async run(r) {
        await r.setMethodArchived(m.id, del)
        return { undo: (r2) => r2.setMethodArchived(m.id, !del) }
      },
    }
  }
  if (action !== 'create' && action !== 'update') return 'action must be create, update, delete or restore'

  const base: Omit<PaymentMethod, 'id' | 'archived'> = before
    ? { spaceId: before.spaceId, name: before.name, kind: before.kind, sourceId: before.sourceId, creditLimit: before.creditLimit, limitSharedWith: before.limitSharedWith, closingDay: before.closingDay, paymentDay: before.paymentDay }
    : { spaceId: str(a, 'space_id') ?? c.space.id, name: '', kind: 'credit', sourceId: '', creditLimit: null, limitSharedWith: null, closingDay: null, paymentDay: null }
  const kind = (a.kind as MethodKind | undefined) ?? base.kind
  if (!['cash', 'debit', 'credit'].includes(kind)) return 'kind must be cash, debit or credit'
  const credit = kind === 'credit'
  const next = {
    ...base, kind,
    name: str(a, 'name') ?? base.name,
    sourceId: str(a, 'source_id') ?? base.sourceId,
    limitSharedWith: credit ? (has(a, 'limit_shared_with') ? str(a, 'limit_shared_with') || null : base.limitSharedWith) : null,
    closingDay: credit ? ((a.closing_day as number) ?? base.closingDay ?? null) : null,
    paymentDay: credit ? ((a.payment_day as number) ?? base.paymentDay ?? null) : null,
    creditLimit: credit ? ((a.credit_limit as number) ?? base.creditLimit ?? null) : null,
  }
  if (next.limitSharedWith) next.creditLimit = null
  if (!w.spaces.some((s) => s.id === next.spaceId)) return 'unknown space_id'
  if (!next.name || next.name.length > 40) return 'name must be 1-40 characters'
  if (!w.sources.some((s) => s.id === next.sourceId && !s.archived)) return 'source_id must be a source it is paid from'
  if (credit) {
    if (!Number.isInteger(next.closingDay) || next.closingDay! < 1 || next.closingDay! > 31) return 'a credit card needs closing_day 1-31'
    if (!Number.isInteger(next.paymentDay) || next.paymentDay! < 1 || next.paymentDay! > 31) return 'a credit card needs payment_day 1-31'
    if (next.creditLimit !== null && !whole(next.creditLimit)) return 'credit_limit must be a whole number of yen'
    if (next.limitSharedWith) {
      const other = w.methods.find((m) => m.id === next.limitSharedWith)
      if (!other || other.kind !== 'credit' || other.limitSharedWith || other.id === before?.id) return 'limit_shared_with must be another credit card with its own limit'
    }
  }
  const sourceName = (id: string) => w.sources.find((s) => s.id === id)?.name
  if (action === 'create') {
    const draft: PaymentMethod = { ...next, id: `new:${key}`, archived: false }
    return {
      key, op: 'setup', what: 'method', tone: 'add', title: next.name, draft,
      detail: [t('methods'), kindName(kind), sourceName(next.sourceId), credit && next.creditLimit ? `${t('limit')} ${yen(next.creditLimit)}` : ''].filter(Boolean).join(' · '),
      async run(r, id) {
        const created = await r.addMethod({ ...next, spaceId: id(next.spaceId), sourceId: id(next.sourceId), limitSharedWith: next.limitSharedWith && id(next.limitSharedWith) })
        return { created, undo: (r2) => r2.setMethodArchived(created, true) }
      },
    }
  }
  const detail = diff([
    [t('name'), base.name, next.name], [t('kind'), kindName(base.kind), kindName(next.kind)], [t('paidFrom'), sourceName(base.sourceId), sourceName(next.sourceId)],
    [t('limit'), base.creditLimit === null ? null : yen(base.creditLimit), next.creditLimit === null ? null : yen(next.creditLimit)],
    [t('stmtClose'), base.closingDay, next.closingDay], [t('payDue'), base.paymentDay, next.paymentDay],
  ])
  if (!detail) return 'nothing changes'
  return {
    key, op: 'setup', what: 'method', tone: 'edit', title: base.name, detail: `${t('methods')} · ${detail}`,
    async run(r, id) {
      await r.updateMethod(before!.id, { ...next, sourceId: id(next.sourceId), limitSharedWith: next.limitSharedWith && id(next.limitSharedWith) })
      return { undo: (r2) => r2.updateMethod(before!.id, base) }
    },
  }
}

export function proposeSpace(a: Args, c: SetupCtx): SetupChange | string {
  const { t, snap } = c
  const me = snap.me.id
  const action = str(a, 'action')
  const key = newKey()
  const tone = a.tone as Tone | undefined
  if (tone && !TONES.includes(tone)) return 'tone must be me, a, b, c or d'
  const name = str(a, 'name')
  if (name !== undefined && (!name || name.length > 40)) return 'name must be 1-40 characters'
  const make = (tn: SetupTone, title: string, detail: string, run: SetupChange['run'], draft?: Space): SetupChange =>
    ({ key, op: 'setup', what: 'space', tone: tn, title, detail: `${t('space')} · ${detail}`, run, ...(draft ? { draft } : {}) })

  if (action === 'create') {
    if (!name) return 'name is required'
    const draft: Space = { id: `new:${key}`, kind: 'household', name, tone: tone ?? 'a', ownerId: me, inviteCode: null, memberIds: [me] }
    return make('add', name, t('hhName'), async (r) => {
      const created = await r.createHousehold(name, draft.tone)
      return { created, undo: (r2) => r2.setSpaceDeleted(created, true) }
    }, draft)
  }
  if (action === 'join') {
    const code = str(a, 'code')?.toUpperCase()
    if (!code || !/^LFY-[A-Z0-9]{6}$/.test(code)) return 'code must look like LFY-XXXXXX'
    return make('add', code, t('joinTitle'), async (r) => {
      const joined = await r.joinHousehold(code)
      return { undo: (r2) => r2.leaveHousehold(joined) }
    })
  }
  if (!has(a, 'space_id')) return missing('space_id')
  const deleted = snap.deletedSpaces.find((s) => s.id === a.space_id)
  if (action === 'restore') {
    if (!deleted) return 'not one of your deleted spaces'
    return make('restore', deleted.name, t('restore'), async (r) => {
      await r.setSpaceDeleted(deleted.id, false)
      return { undo: (r2) => r2.setSpaceDeleted(deleted.id, true) }
    })
  }
  const sp = snap.spaces.find((s) => s.id === a.space_id)
  if (!sp) return 'unknown space_id'
  const owner = sp.ownerId === me
  const shared = sp.kind === 'household'
  switch (action) {
    case 'rename':
      if (!name || name === sp.name) return 'name is required and must differ'
      return make('edit', sp.name, `${t('name')}: ${sp.name} → ${name}`, async (r) => {
        await r.renameSpace(sp.id, name)
        return { undo: (r2) => r2.renameSpace(sp.id, sp.name) }
      })
    case 'recolor':
      if (!tone || tone === sp.tone) return 'tone is required and must differ'
      return make('edit', sp.name, `${t('colour')}: ${sp.tone} → ${tone}`, async (r) => {
        await r.setSpaceTone(sp.id, tone)
        return { undo: (r2) => r2.setSpaceTone(sp.id, sp.tone) }
      })
    case 'delete':
      if (!shared) return 'the personal space cannot be deleted'
      if (!owner) return 'only the owner can delete a space'
      return make('delete', sp.name, t('deleteSpace'), async (r) => {
        await r.setSpaceDeleted(sp.id, true)
        return { undo: (r2) => r2.setSpaceDeleted(sp.id, false) }
      })
    case 'leave':
      if (!shared) return 'the personal space cannot be left'
      if (owner) return 'the owner cannot leave; delete the space instead'
      return make('delete', sp.name, t('leave'), async (r) => {
        await r.leaveHousehold(sp.id)
        // coming back needs a new invite code
        return { undo: null }
      })
    case 'remove_member': {
      if (!owner) return 'only the owner can remove members'
      const member = str(a, 'member_id')
      if (!member || member === me || !sp.memberIds.includes(member)) return 'member_id must be another member of the space'
      const who = snap.profiles[member]?.displayName ?? member
      return make('delete', sp.name, `${t('remove')}: ${who}`, async (r) => {
        await r.removeMember(sp.id, member)
        return { undo: null }
      })
    }
    case 'new_invite_code':
      if (!shared || !owner) return 'only the owner of a shared space can make a new invite code'
      return make('edit', sp.name, t('newCode'), async (r) => {
        await r.resetInviteCode(sp.id)
        return { undo: null }
      })
  }
  return 'unknown action'
}

export function proposeProfile(a: Args, c: SetupCtx): SetupChange | string {
  const { t, snap } = c
  const me = snap.me
  const patch: Partial<Pick<Profile, 'displayName' | 'locale' | 'avatar' | 'theme'>> = {}
  const name = str(a, 'display_name')
  if (name !== undefined) {
    if (!name || name.length > 30) return 'display_name must be 1-30 characters'
    patch.displayName = name
  }
  if (has(a, 'locale')) {
    if (a.locale !== 'ja' && a.locale !== 'en') return 'locale must be ja or en'
    patch.locale = a.locale
  }
  if (has(a, 'theme')) {
    if (!THEMES.includes(a.theme as Theme)) return 'theme must be midnight, light or milky'
    patch.theme = a.theme as Theme
  }
  if (has(a, 'avatar')) {
    const v = str(a, 'avatar')
    if (v !== 'none' && !(CHARACTERS as readonly string[]).includes(v ?? '')) return 'avatar must be c1-c14 or none'
    patch.avatar = v === 'none' ? null : v!
  }
  const before = { displayName: me.displayName, locale: me.locale, theme: me.theme, avatar: me.avatar }
  // a photo shows as the word, never its data
  const look = (x: string | null) => (isPhoto(x) ? t('yourPhoto') : (x ?? '—'))
  const detail = diff([
    [t('yourName'), before.displayName, patch.displayName ?? before.displayName], [t('language'), before.locale, patch.locale ?? before.locale],
    [t('theme'), before.theme, patch.theme ?? before.theme], [t('character'), look(before.avatar), look(patch.avatar === undefined ? before.avatar : patch.avatar)],
  ])
  if (!detail) return 'nothing changes'
  return {
    key: newKey(), op: 'setup', what: 'profile', tone: 'edit', title: me.displayName || t('me'), detail: `${t('profile')} · ${detail}`,
    async run(r) {
      await r.updateProfile(patch)
      return { undo: (r2) => r2.updateProfile(before) }
    },
  }
}

/**
 * A repeating schedule changed from its next date, or stopped. `build` makes the new entry from the arguments the
 * way propose_edit does. Records dated today or earlier never change.
 */
export function proposeSchedule(a: Args, c: SetupCtx & { entries: Entry[] }, build: (a: Args, before: Entry) => NewEntry | string): SetupChange | string {
  const { t, snap, today } = c
  const template = c.entries.find((e) => e.id === a.entry_id)
  if (!template || !isTemplate(template)) return 'entry_id must be a repeating schedule (an entry with repeat set)'
  if (template.createdBy !== snap.me.id) return 'only the person who made a schedule can change it'
  const nextDate = template.occurredOn > today ? template.occurredOn : nextOccurrence(template, today)
  const label = template.name || template.note || t('repeat')
  let next: NewEntry | null = null
  if (a.stop !== true && a.repeat !== 'none') {
    const built = build({ date: nextDate, ...a }, template)
    if (typeof built === 'string') return built
    next = { ...built, repeat: (a.repeat as Entry['repeat'] | undefined) ?? template.repeat, repeatOf: null }
  }
  const plan = scheduleChange(template, c.entries, today, next)
  return {
    key: newKey(), op: 'setup', what: 'schedule', tone: next ? 'edit' : 'delete', title: label,
    detail: next ? `${t('editSchedule')} · ${t('nextDate')} ${next.occurredOn} · ${yen(next.amount)}` : t('stopRepeat'),
    async run(r) {
      await runSchedule(r, template, plan)
      return { undo: null }
    },
  }
}

export function proposePot(a: Args, c: SetupCtx): SetupChange | string {
  const { t, snap } = c
  const w = world(c)
  const action = str(a, 'action')
  const name = str(a, 'name')
  const color = str(a, 'color')
  if (color && !/^#[0-9a-f]{6}$/i.test(color)) return 'color must be #RRGGBB'
  if (name !== undefined && (!name || name.length > 40)) return 'name must be 1-40 characters'
  if (has(a, 'monthly') && !whole(a.monthly)) return 'monthly must be a whole number of yen, 0 or more'
  if (has(a, 'goal') && !(a.goal === 0 || (Number.isInteger(a.goal) && (a.goal as number) > 0))) return 'goal must be a whole number of yen; 0 for none'
  const key = newKey()
  const money = (p: Pick<Pot, 'goal' | 'monthly'>) => [p.monthly ? `${t('potMonthly')} ${yen(p.monthly)}` : '', p.goal ? `${t('potGoal')} ${yen(p.goal)}` : ''].filter(Boolean).join(' · ')
  if (action === 'create') {
    const spaceId = str(a, 'space_id') ?? c.space.id
    if (!w.spaces.some((s) => s.id === spaceId)) return 'unknown space_id'
    if (!name) return 'name is required'
    const mine = w.pots.filter((p) => p.spaceId === spaceId)
    const draft: Pot = {
      id: `new:${key}`, spaceId, name, color: color ?? SWATCHES[mine.length % SWATCHES.length], goal: (a.goal as number) || null,
      monthly: (a.monthly as number) ?? 0, sort: Math.max(0, ...mine.map((p) => p.sort)) + 1, archived: false,
    }
    return {
      key, op: 'setup', what: 'pot', tone: 'add', title: name, draft, detail: [t('savings'), money(draft)].filter(Boolean).join(' · '),
      async run(r, id) {
        const created = await r.savePot({ ...draft, id: undefined, spaceId: id(spaceId) })
        return { created, undo: (r2) => r2.setPotArchived(created, true) }
      },
    }
  }
  if (!has(a, 'pot_id')) return missing('pot_id')
  const before = snap.pots.find((p) => p.id === a.pot_id)
  if (!before) return 'unknown pot_id'
  if (action === 'update') {
    const after: Pot = {
      ...before, name: name ?? before.name, color: color ?? before.color,
      goal: has(a, 'goal') ? (a.goal as number) || null : before.goal, monthly: has(a, 'monthly') ? (a.monthly as number) : before.monthly,
    }
    const detail = diff([[t('name'), before.name, after.name], [t('potMonthly'), yen(before.monthly), yen(after.monthly)],
      [t('potGoal'), before.goal === null ? null : yen(before.goal), after.goal === null ? null : yen(after.goal)], [t('colour'), before.color, after.color]])
    if (!detail) return 'nothing changes'
    return {
      key, op: 'setup', what: 'pot', tone: 'edit', title: before.name, detail: `${t('savings')} · ${detail}`,
      async run(r) {
        await r.savePot(after)
        return { undo: async (r2) => void (await r2.savePot(before)) }
      },
    }
  }
  if (action === 'delete' || action === 'restore') {
    const del = action === 'delete'
    if (before.archived === del) return del ? 'already deleted' : 'it is not deleted'
    return {
      key, op: 'setup', what: 'pot', tone: del ? 'delete' : 'restore', title: before.name, detail: t('savings'),
      async run(r) {
        await r.setPotArchived(before.id, del)
        return { undo: (r2) => r2.setPotArchived(before.id, !del) }
      },
    }
  }
  return 'action must be create, update, delete or restore'
}

/** Money put into a pot (a positive amount) or taken out (negative). No account changes. */
export function proposePotMove(a: Args, c: SetupCtx): SetupChange | string {
  const { t } = c
  if (!has(a, 'pot_id')) return missing('pot_id')
  const pot = world(c).pots.find((p) => p.id === a.pot_id && !p.archived)
  if (!pot) return 'unknown pot_id'
  const amount = a.amount
  if (!Number.isInteger(amount) || amount === 0) return 'amount must be a whole number of yen: positive to save, negative to take out'
  const date = str(a, 'date') ?? c.today
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'date must be YYYY-MM-DD'
  const note = (str(a, 'note') ?? '').slice(0, 200)
  const n = amount as number
  return {
    key: newKey(), op: 'setup', what: 'pot_move', tone: n > 0 ? 'add' : 'delete', title: pot.name,
    detail: [n > 0 ? t('saveInX', { a: yen(n) }) : t('takeOutX', { a: yen(-n) }), date, note].filter(Boolean).join(' · '),
    async run(r, id) {
      const moved = await r.addPotMove({ potId: id(pot.id), spaceId: id(pot.spaceId), amount: n, occurredOn: date, note })
      return { undo: (r2) => r2.deletePotMove(moved) }
    },
  }
}
