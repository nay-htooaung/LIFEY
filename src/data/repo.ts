import { asNew, type ScheduleChange } from '../domain/recurring'
import type { Category, Entry, NewEntry, PaymentMethod, Profile, Snapshot, Source, Tone } from '../domain/types'

export type NewSource = Omit<Source, 'id' | 'createdOn' | 'archived' | 'fixed'>
export type NewMethod = Omit<PaymentMethod, 'id' | 'archived'>
export type CategoryInput = Omit<Category, 'id'> & { id?: string }

/** Everything the UI needs from storage. Demo mode and Supabase mode both implement it. */
export interface Repo {
  mode: 'demo' | 'cloud'
  /**
   * Everything except older entries: this month's entries, plus repeating entries and their posted copies
   * (needed to post what is due without duplicates). Other months come from loadMonth.
   */
  load(): Promise<Snapshot>
  /** All entries I can see dated in `month` (YYYY-MM). */
  loadMonth(month: string): Promise<Entry[]>
  addEntries(entries: NewEntry[]): Promise<void>
  updateEntry(id: string, entry: NewEntry): Promise<void>
  deleteEntry(id: string): Promise<void>
  addSource(source: NewSource): Promise<string>
  updateSource(id: string, source: NewSource): Promise<void>
  /** Deletes (true) or restores (false). Nothing is erased. */
  setSourceArchived(id: string, archived: boolean): Promise<void>
  setMethodArchived(id: string, archived: boolean): Promise<void>
  addMethod(method: NewMethod): Promise<string>
  updateMethod(id: string, method: NewMethod): Promise<void>
  saveCategory(category: CategoryInput): Promise<string>
  archiveCategory(id: string): Promise<void>
  createHousehold(name: string, tone: Tone): Promise<string>
  joinHousehold(code: string): Promise<string>
  leaveHousehold(spaceId: string): Promise<void>
  renameSpace(spaceId: string, name: string): Promise<void>
  setSpaceTone(spaceId: string, tone: Tone): Promise<void>
  removeMember(spaceId: string, userId: string): Promise<void>
  /** Deletes (true) or restores (false) a space I own. Nothing in it is erased. */
  setSpaceDeleted(spaceId: string, deleted: boolean): Promise<void>
  resetInviteCode(spaceId: string): Promise<string>
  updateProfile(patch: Partial<Pick<Profile, 'displayName' | 'locale' | 'avatar' | 'theme'>>): Promise<void>
  signOut(): Promise<void>
  /** Called when another member changes something. Returns an unsubscribe function. */
  subscribe(onChange: () => void): () => void
}

export class RepoError extends Error {
  constructor(public code: 'bad_invite' | 'offline' | 'other', message: string) {
    super(message)
  }
}

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)

/** Carries out a schedule change: drop replaced copies, end or rewrite the old template, add the new one. */
export async function runSchedule(r: Repo, template: Entry, plan: ScheduleChange) {
  for (const id of plan.remove) await r.deleteEntry(id)
  if (plan.end) await r.updateEntry(template.id, { ...asNew(template), repeat: 'none' })
  if (plan.update) await r.updateEntry(template.id, plan.update)
  if (plan.add) await r.addEntries([plan.add])
}
