import type { SupabaseClient } from '@supabase/supabase-js'
import { addDays, today } from '../domain/dates'
import type { Category, Entry, Flow, PaymentMethod, Profile, Snapshot, Source, Space } from '../domain/types'
import { RepoError, type Repo } from './repo'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>

const toProfile = (r: Row): Profile => ({
  id: r.id, displayName: r.display_name, color: r.color, locale: r.locale, avatar: r.avatar ?? null, theme: r.theme ?? 'midnight',
})
const toSource = (r: Row): Source => ({
  id: r.id, spaceId: r.space_id, name: r.name, kind: r.kind, openingBalance: Number(r.opening_balance), createdOn: String(r.created_at).slice(0, 10), archived: !!r.archived,
})
const toMethod = (r: Row): PaymentMethod => ({
  id: r.id, spaceId: r.space_id, name: r.name, kind: r.kind, sourceId: r.source_id,
  creditLimit: r.credit_limit == null ? null : Number(r.credit_limit), limitSharedWith: r.limit_shared_with ?? null, closingDay: r.closing_day, paymentDay: r.payment_day,
  archived: !!r.archived,
})
const toCategory = (r: Row): Category => ({
  id: r.id, spaceId: r.space_id, name: r.name, color: r.color, kind: r.kind, monthlyBudget: Number(r.monthly_budget), sort: r.sort,
})
const toEntry = (r: Row): Entry => ({
  id: r.id, spaceId: r.space_id, kind: r.kind, amount: Number(r.amount), categoryId: r.category_id, methodId: r.method_id,
  sourceId: r.source_id, occurredOn: r.occurred_on, name: r.name ?? '', note: r.note, tags: r.tags ?? [], repeat: r.repeat, repeatOf: r.repeat_of, createdBy: r.created_by,
})
const entryRow = (e: Omit<Entry, 'id' | 'createdBy'>) => ({
  space_id: e.spaceId, kind: e.kind, amount: e.amount, category_id: e.categoryId, method_id: e.kind === 'expense' ? e.methodId : null,
  source_id: e.kind === 'income' || !e.methodId ? e.sourceId : null, occurred_on: e.occurredOn, name: e.name, note: e.note, tags: e.tags, repeat: e.repeat, repeat_of: e.repeatOf,
})

const methodRow = (m: Omit<PaymentMethod, 'id' | 'archived'>) => ({
  space_id: m.spaceId, name: m.name, kind: m.kind, source_id: m.sourceId, credit_limit: m.creditLimit,
  limit_shared_with: m.limitSharedWith, closing_day: m.closingDay, payment_day: m.paymentDay,
})

function check<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) throw new RepoError('offline', res.error.message)
    throw new RepoError(res.error.code === 'P0002' ? 'bad_invite' : 'other', res.error.message)
  }
  return res.data
}

export function createCloudRepo(sb: SupabaseClient, userId: string): Repo {
  return {
    mode: 'cloud',
    async load(): Promise<Snapshot> {
      const since = addDays(today(), -400)
      const [profiles, spaces, members, sources, methods, cats, entries, flows] = await Promise.all([
        sb.from('profiles').select('*'),
        sb.from('spaces').select('*').order('created_at'),
        sb.from('space_members').select('space_id,user_id,joined_at').is('left_at', null).order('joined_at'),
        sb.from('sources').select('*').order('created_at'),
        sb.from('payment_methods').select('*').order('created_at'),
        sb.from('categories').select('*').eq('archived', false).order('sort').order('created_at'),
        sb.from('entries').select('*').or(`occurred_on.gte.${since},repeat.neq.none`).order('occurred_on', { ascending: false }).limit(10000),
        sb.rpc('money_flows'),
      ])
      const profs = Object.fromEntries((check(profiles) as Row[]).map((r) => [r.id, toProfile(r)]))
      const memberRows = check(members) as Row[]
      const spaceRows = check(spaces) as Row[]
      const toSpace = (r: Row): Space => ({
        id: r.id, kind: r.kind, name: r.name, tone: r.tone, ownerId: r.owner_id, inviteCode: r.invite_code,
        memberIds: memberRows.filter((m) => m.space_id === r.id).map((m) => m.user_id),
      })
      const spaceList: Space[] = spaceRows.filter((r) => !r.deleted_at).map(toSpace)
        .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'personal' ? -1 : 1))
      return {
        me: profs[userId],
        profiles: profs,
        spaces: spaceList,
        deletedSpaces: spaceRows.filter((r) => r.deleted_at).map(toSpace),
        sources: (check(sources) as Row[]).map(toSource),
        methods: (check(methods) as Row[]).map(toMethod),
        categories: (check(cats) as Row[]).map(toCategory),
        entries: (check(entries) as Row[]).map(toEntry),
        flows: (check(flows) as Row[]).map((r): Flow => ({
          methodId: r.method_id, sourceId: r.source_id, kind: r.kind, amount: Number(r.amount), occurredOn: r.occurred_on,
        })),
      }
    },
    async addEntries(list) {
      if (!list.length) return
      // ignoreDuplicates: two devices may post the same repeating entry at once
      check(await sb.from('entries').upsert(list.map(entryRow), { onConflict: 'repeat_of,occurred_on', ignoreDuplicates: true }))
    },
    async updateEntry(id, e) {
      check(await sb.from('entries').update(entryRow(e)).eq('id', id))
    },
    async deleteEntry(id) {
      check(await sb.from('entries').delete().eq('id', id))
    },
    async addSource(s) {
      const r = check(await sb.from('sources').insert({ space_id: s.spaceId, name: s.name, kind: s.kind, opening_balance: s.openingBalance }).select('id').single())
      return (r as Row).id
    },
    async updateSource(id, s) {
      check(await sb.from('sources').update({ name: s.name, kind: s.kind, opening_balance: s.openingBalance }).eq('id', id))
    },
    async setSourceArchived(id, archived) {
      check(await sb.from('sources').update({ archived }).eq('id', id))
    },
    async setMethodArchived(id, archived) {
      check(await sb.from('payment_methods').update({ archived }).eq('id', id))
    },
    async addMethod(m) {
      return (check(await sb.from('payment_methods').insert(methodRow(m)).select('id').single()) as Row).id
    },
    async updateMethod(id, m) {
      check(await sb.from('payment_methods').update(methodRow(m)).eq('id', id))
    },
    async saveCategory(c) {
      const row = { space_id: c.spaceId, name: c.name, color: c.color, kind: c.kind, monthly_budget: c.monthlyBudget, sort: c.sort }
      if (c.id) {
        check(await sb.from('categories').update(row).eq('id', c.id))
        return c.id
      }
      return (check(await sb.from('categories').insert(row).select('id').single()) as Row).id
    },
    async archiveCategory(id) {
      check(await sb.from('categories').update({ archived: true }).eq('id', id))
    },
    async createHousehold(name, tone) {
      return check(await sb.rpc('create_household', { p_name: name, p_tone: tone })) as string
    },
    async joinHousehold(code) {
      return check(await sb.rpc('join_household', { p_code: code })) as string
    },
    async leaveHousehold(spaceId) {
      check(await sb.rpc('leave_household', { p_space: spaceId }))
    },
    async renameSpace(spaceId, name) {
      check(await sb.from('spaces').update({ name }).eq('id', spaceId))
    },
    async removeMember(spaceId, memberId) {
      check(await sb.rpc('remove_space_member', { p_space: spaceId, p_user: memberId }))
    },
    async setSpaceDeleted(spaceId, deleted) {
      check(await sb.rpc('set_space_deleted', { p_space: spaceId, p_deleted: deleted }))
    },
    async resetInviteCode(spaceId) {
      return check(await sb.rpc('reset_invite_code', { p_space: spaceId })) as string
    },
    async updateProfile(patch) {
      const row: Row = {}
      if (patch.displayName !== undefined) row.display_name = patch.displayName
      if (patch.locale !== undefined) row.locale = patch.locale
      if (patch.avatar !== undefined) row.avatar = patch.avatar
      if (patch.theme !== undefined) row.theme = patch.theme
      check(await sb.from('profiles').update(row).eq('id', userId))
    },
    async signOut() {
      await sb.auth.signOut()
    },
    subscribe(onChange) {
      let timer: ReturnType<typeof setTimeout> | undefined
      const ping = () => {
        clearTimeout(timer)
        timer = setTimeout(onChange, 400)
      }
      const channel = sb.channel('lifey-money')
      for (const table of ['entries', 'sources', 'payment_methods', 'categories', 'spaces', 'space_members']) {
        channel.on('postgres_changes', { event: '*', schema: 'public', table }, ping)
      }
      channel.subscribe()
      const onFocus = () => document.visibilityState === 'visible' && ping()
      document.addEventListener('visibilitychange', onFocus)
      return () => {
        clearTimeout(timer)
        document.removeEventListener('visibilitychange', onFocus)
        void sb.removeChannel(channel)
      }
    },
  }
}
