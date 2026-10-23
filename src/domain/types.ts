export type Locale = 'en' | 'ja'
export type SpaceKind = 'personal' | 'household'
export type Tone = 'me' | 'a' | 'b' | 'c' | 'd'
export type SourceKind = 'bank' | 'savings' | 'cash'
export type MethodKind = 'cash' | 'debit' | 'credit' | 'emoney'
export type EntryKind = 'expense' | 'income'
export type Repeat = 'none' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'
/** Calendar date in the user's local time, `YYYY-MM-DD`. */
export type Day = string

export interface Profile {
  id: string
  displayName: string
  color: string
  locale: Locale
}

export interface Space {
  id: string
  kind: SpaceKind
  name: string
  tone: Tone
  ownerId: string
  inviteCode: string | null
  memberIds: string[]
}

export interface Source {
  id: string
  spaceId: string
  name: string
  kind: SourceKind
  /** Balance on the day the source was added. Later entries move it. */
  openingBalance: number
  createdOn: Day
}

export interface PaymentMethod {
  id: string
  spaceId: string
  name: string
  kind: MethodKind
  sourceId: string
  creditLimit: number | null
  /** Credit only. The card whose limit this one shares (same account, family card); its own creditLimit is then null. */
  limitSharedWith: string | null
  /** Credit only. Statement closes on this day; it is paid on paymentDay of the following month. */
  closingDay: number | null
  paymentDay: number | null
}

export interface Category {
  id: string
  spaceId: string
  name: string
  color: string
  kind: EntryKind
  monthlyBudget: number
  sort: number
}

export interface Entry {
  id: string
  spaceId: string
  kind: EntryKind
  /** Whole yen, always positive. */
  amount: number
  categoryId: string | null
  /** Expenses: the payment method, or null when paid straight from `sourceId` (bank transfer). */
  methodId: string | null
  sourceId: string | null
  occurredOn: Day
  /** Optional title; lists fall back to the note, then the category. */
  name: string
  note: string
  tags: string[]
  repeat: Repeat
  repeatOf: string | null
  createdBy: string
}

export type NewEntry = Omit<Entry, 'id' | 'createdBy'>

/** A charge or deposit against a method/source the user can see, possibly from an entry they cannot see. */
export interface Flow {
  methodId: string | null
  sourceId: string | null
  kind: EntryKind
  amount: number
  occurredOn: Day
}

export interface Snapshot {
  me: Profile
  profiles: Record<string, Profile>
  spaces: Space[]
  sources: Source[]
  methods: PaymentMethod[]
  categories: Category[]
  entries: Entry[]
  flows: Flow[]
  noSpendDays: Day[]
}
