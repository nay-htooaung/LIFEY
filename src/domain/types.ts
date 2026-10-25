export type Locale = 'en' | 'ja'
export type Theme = 'midnight' | 'light' | 'milky'
export type SpaceKind = 'personal' | 'household'
export type Tone = 'me' | 'a' | 'b' | 'c' | 'd'
export type SourceKind = 'bank' | 'cash' | 'emoney'
export type MethodKind = 'cash' | 'debit' | 'credit'
/** What a category or a flow of money is. */
export type MoneyKind = 'expense' | 'income'
/** Entries can also move money between two sources. */
export type EntryKind = MoneyKind | 'transfer'
export type Repeat = 'none' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'
/** Calendar date in the user's local time, `YYYY-MM-DD`. */
export type Day = string

export interface Profile {
  id: string
  displayName: string
  color: string
  locale: Locale
  /** A character id from CHARACTERS (ui/characters.tsx), or null for the initial of the name. */
  avatar: string | null
  theme: Theme
}

export interface Space {
  id: string
  kind: SpaceKind
  name: string
  tone: Tone
  ownerId: string
  inviteCode: string | null
  /** Active members only; people who left or were removed are not listed. */
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
  /** Deleted by the user: hidden from lists and pickers, kept so past entries and balances stay right. */
  archived: boolean
  /** The cash source every personal space starts with: its name and kind stay, and it cannot be deleted. */
  fixed: boolean
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
  /** Deleted by the user: hidden from lists and pickers, kept so past entries and balances stay right. */
  archived: boolean
}

/**
 * A personal payment method shared into a space: its members may pay there with it but see only this much.
 * The owner gets their own shares here too. A share that was stopped stays (active false) so past entries keep the name.
 */
export interface MethodShare {
  methodId: string
  /** The space it is shared into. */
  spaceId: string
  name: string
  kind: MethodKind
  ownerId: string
  archived: boolean
  active: boolean
}

export interface Category {
  id: string
  spaceId: string
  name: string
  color: string
  kind: MoneyKind
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
  /** Expenses: the payment method, or null when paid straight from `sourceId`. Transfer: a credit card charging e-money. */
  methodId: string | null
  /** Income: where it lands. Expense without a method: where it is paid from. Transfer without a method: where it leaves. */
  sourceId: string | null
  /** Transfer only: where the money lands. */
  toSourceId: string | null
  /** Transfer only: a charge taken from sourceId on top of amount. It counts as spending; the amount does not. */
  fee: number
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
  kind: MoneyKind
  amount: number
  occurredOn: Day
}

/** 貯金: money set aside on paper in a space. Not tied to any account. */
export interface Pot {
  id: string
  spaceId: string
  name: string
  color: string
  /** The total to reach, or null for none. */
  goal: number | null
  /** To set aside each month; it comes off what is left to spend. 0 for none. */
  monthly: number
  sort: number
  /** Deleted by the user: hidden, kept so its total stays, can be restored. */
  archived: boolean
}

/** Money put into a pot (positive) or taken out (negative). */
export interface PotMove {
  id: string
  potId: string
  spaceId: string
  amount: number
  occurredOn: Day
  note: string
  createdBy: string
}

export interface Snapshot {
  me: Profile
  profiles: Record<string, Profile>
  spaces: Space[]
  /** Spaces I own and deleted. They can be restored with everything in them. */
  deletedSpaces: Space[]
  sources: Source[]
  methods: PaymentMethod[]
  categories: Category[]
  entries: Entry[]
  flows: Flow[]
  /** Every pot of my spaces, archived ones too, and all their moves (totals need every month). */
  pots: Pot[]
  potMoves: PotMove[]
  methodShares: MethodShare[]
}
