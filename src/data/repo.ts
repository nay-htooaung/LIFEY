import type { Category, NewEntry, PaymentMethod, Profile, Snapshot, Source, Tone } from '../domain/types'

export type NewSource = Omit<Source, 'id' | 'createdOn' | 'archived'>
export type NewMethod = Omit<PaymentMethod, 'id' | 'archived'>
export type CategoryInput = Omit<Category, 'id'> & { id?: string }

/** Everything the UI needs from storage. Demo mode and Supabase mode both implement it. */
export interface Repo {
  mode: 'demo' | 'cloud'
  load(): Promise<Snapshot>
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
