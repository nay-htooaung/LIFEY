// What the assistant can do, shared by the Worker (which sends it to the model) and the app (which runs it).
// Tools run in the app with the signed-in person's own data, so the model sees only what they can see.
// Nothing here saves: propose_* tools put changes in a tray that the person applies themselves.
// The system prompt never changes, and the app guide (with today's date and the space) goes with the first message
// of a conversation only, so every request of a conversation starts the same way and the provider's cache can hold it.

export interface ChatContext {
  today: string
  locale: 'en' | 'ja'
  space: { id: string; name: string }
}

const str = (description: string) => ({ type: 'string', description })
const int = (description: string) => ({ type: 'integer', description })

const entryFields = {
  space_id: str('Space the entry belongs to. Defaults to the current space.'),
  kind: { type: 'string', enum: ['expense', 'income', 'transfer'] },
  amount: int('Whole yen, positive.'),
  date: str('YYYY-MM-DD.'),
  category_id: str('A category of the same space and kind. Not for transfers.'),
  method_id: str('Expense: the payment method. Transfer: a credit card charging an e-money source.'),
  source_id: str('Expense paid straight from a source, income landing in a source, or the source a transfer leaves.'),
  to_source_id: str('Transfer only: where the money lands.'),
  fee: int('Transfer only: a fee taken on top of the amount.'),
  name: str('Short title, e.g. "Lunch".'),
  note: str('Optional note.'),
  repeat: { type: 'string', enum: ['none', 'weekly', 'biweekly', 'monthly', 'yearly'], description: 'New entries only: repeat from date on.' },
}
const action = (actions: string[], description: string) => ({ type: 'string', enum: actions, description })
const tool = (name: string, description: string, properties: Record<string, unknown>, required: string[] = []) =>
  ({ type: 'function', function: { name, description, parameters: { type: 'object', properties, required } } }) as const

export const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_overview',
      description: 'Everything the person can see except entries: their profile, spaces (members, invite codes), sources with balances, payment methods (cards: limits, statement days, what is owed), categories with budgets and spending this month, and deleted things that can be restored. Call this first to learn ids.',
      // no parameters: Gemini refuses an object schema with no properties
    },
  },
  tool('list_entries', 'Entries in one month that the person can see, newest first.',
    { month: str('YYYY-MM'), space_id: str('Only this space. Omit for every space.'), text: str('Only entries whose name, note or category contains this.') }, ['month']),
  tool('coming_up', 'Repeating bills, income, transfers and card payments due in the next 45 days for a space.', { space_id: str('Defaults to the current space.') }),
  tool('propose_entry', 'Propose a new entry (set repeat for a repeating one).', entryFields, ['kind', 'amount', 'date']),
  tool('propose_edit', 'Propose changing one entry; give only the fields that change. For the first record of a repeating schedule use propose_schedule.',
    { entry_id: str('From list_entries.'), ...entryFields }, ['entry_id']),
  tool('propose_delete', 'Propose deleting one entry. For the first record of a repeating schedule use propose_schedule with stop.',
    { entry_id: str('From list_entries.') }, ['entry_id']),
  tool('propose_schedule', 'Propose changing a repeating schedule from its next date, or stopping it. Records dated today or earlier never change.',
    { entry_id: str('The schedule (an entry with repeat set, from list_entries).'), stop: { type: 'boolean', description: 'Stop repeating.' }, ...entryFields }, ['entry_id']),
  tool('propose_category', 'Propose creating, changing or deleting a category (with its monthly budget).', {
    action: action(['create', 'update', 'delete'], 'Deleted categories cannot be restored.'), category_id: str('For update and delete.'),
    space_id: str('For create.'), name: str('Name.'), kind: { type: 'string', enum: ['expense', 'income'] }, color: str('#RRGGBB.'),
    monthly_budget: int('Whole yen; 0 for no budget. Expense categories only.'),
  }, ['action']),
  tool('propose_source', 'Propose adding, changing, deleting or restoring a source (bank account, cash or e-money).', {
    action: action(['create', 'update', 'delete', 'restore'], 'Delete keeps it restorable.'), source_id: str('For update, delete and restore.'),
    space_id: str('For create.'), name: str('Name.'), kind: { type: 'string', enum: ['bank', 'cash', 'emoney'] },
    opening_balance: int('Balance on the day it is added (create), or the balance it had then (update).'),
  }, ['action']),
  tool('propose_method', 'Propose adding, changing, deleting or restoring a payment method (cash, debit or credit card).', {
    action: action(['create', 'update', 'delete', 'restore'], 'Delete keeps it restorable.'), method_id: str('For update, delete and restore.'),
    space_id: str('For create.'), name: str('e.g. "Rakuten Card ••1003".'), kind: { type: 'string', enum: ['cash', 'debit', 'credit'] },
    source_id: str('The source it is paid from.'), credit_limit: int('Credit only; whole yen.'), limit_shared_with: str('Credit only: the card whose limit it shares.'),
    closing_day: int('Credit only: statement closing day, 1-31 (31 = month end).'), payment_day: int('Credit only: paid on this day of the next month.'),
  }, ['action']),
  tool('propose_space', 'Propose a change to spaces: create, rename, recolor, delete or restore one the person owns, leave one, remove a member (owner only), join with an invite code, or make a new invite code.', {
    action: action(['create', 'rename', 'recolor', 'delete', 'restore', 'leave', 'remove_member', 'join', 'new_invite_code'], ''),
    space_id: str('The space, except for create and join.'), name: str('For create and rename.'),
    tone: { type: 'string', enum: ['me', 'a', 'b', 'c', 'd'], description: 'Colour, for create and recolor.' }, member_id: str('For remove_member.'), code: str('For join, e.g. LFY-XXXXXX.'),
  }, ['action']),
  tool('propose_pot', 'Propose creating, changing, deleting or restoring a 貯金 (savings) pot. Pots are money set aside on paper, not an account; the monthly amount comes off what is left at the end of the month.', {
    action: action(['create', 'update', 'delete', 'restore'], 'Delete keeps it restorable.'), pot_id: str('For update, delete and restore.'),
    space_id: str('For create.'), name: str('e.g. "Trip to Okinawa".'), monthly: int('Whole yen to set aside each month; 0 for none.'),
    goal: int('Whole yen to reach; 0 for none.'), color: str('#RRGGBB.'),
  }, ['action']),
  tool('propose_pot_move', 'Propose putting money into a 貯金 pot (positive amount) or taking it out (negative). No account changes.', {
    pot_id: str('The pot, or a new:… id from propose_pot.'), amount: int('Whole yen: positive to save, negative to take out.'),
    date: str('YYYY-MM-DD; defaults to today.'), note: str('Optional note.'),
  }, ['pot_id', 'amount']),
  tool('propose_profile', "Propose changing the person's profile.", {
    display_name: str('Name shown to others.'), locale: { type: 'string', enum: ['ja', 'en'] }, theme: { type: 'string', enum: ['midnight', 'light', 'milky'] },
    avatar: str('A character c1-c14, or "none" for the initial.'),
  }),
  tool('ask_user', 'Ask the person one short question with 2-6 tappable answers when something is unclear. They may also type their own answer.',
    { question: str('One short question.'), options: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 6 } }, ['question', 'options']),
] as const

export type ToolName = (typeof TOOLS)[number]['function']['name']

/** The same for every request, so the provider can cache it. */
export const SYSTEM_PROMPT = [
  'You are the assistant inside Lifey, a household money app for a person and the people they live with.',
  'The first message of the conversation starts with [app], a guide to the app with today\'s date, the language and the space the person is in. Later [app] lines say what changed.',
  'Reply in the language the guide names, in plain short sentences without Markdown. Use the app\'s own names for screens and buttons, exactly as the guide gives them.',
  'Money is whole yen. Dates are YYYY-MM-DD in Japan time.',
  'Use the tools to look things up; never guess ids, balances or entries.',
  'You can change anything the person can, but you cannot save anything yourself: every propose_* tool puts one change in a tray',
  'that the person checks and applies with a long press. Propose all the changes a request needs, then say briefly what you proposed.',
  'A change may refer to something proposed earlier in the same tray by the id its proposal returned (new:…).',
  'If a tool returns an error, fix the arguments and try again, or ask.',
  'When something needed is missing or unclear (amount, how it was paid, which entry), call ask_user with likely answers',
  'taken from their real data, such as their payment method names. Do not ask about things you can look up.',
  'Before proposing to delete many things, a space, or everything, say what it will remove and ask with ask_user.',
  'When they send a photo of a receipt, read the shop, the date and the total (after discounts, including tax).',
  'Propose one expense: name = the shop, note = a few of the main items, date = the receipt date, category from',
  'their categories. If the receipt shows how it was paid (card brand and last digits, IC card, cash), use the matching',
  'method or source; otherwise ask with ask_user. If the photo is not a receipt or cannot be read, say so briefly.',
  'A file they send arrives as "[File: name]" and its text (or, for a scan, its pages as photos). For a bank or card',
  'statement, or any list of payments, do what they ask; to log it, first read that month with list_entries and propose',
  'only what is not logged yet, each with its own date, and paid with the account or card the statement is for.',
  'Read each month once. Make all the proposals in one reply (many tool calls at once), not one per reply.',
  'Other members\' personal accounts are hidden from the person and from you; never try to reveal them.',
].join('\n')

/** The guide that opens a conversation: what the app has and where, in the person's language. */
export function appGuide(c: ChatContext): string {
  const ja = c.locale === 'ja'
  return [
    `[app] Today is ${c.today}. Language: ${ja ? 'Japanese' : 'English'}. The person is in the space "${c.space.name}" (id ${c.space.id}).`,
    ja ? [
      'Screens (bottom tabs): 今月 (あなたの今月の収支 across every space, スペースごとの支出, 今後の予定, 来月末の残高), 履歴 (month calendar of entries), お財布 (口座・現金 = sources, 支払い方法 = methods, 純資産 with うち貯金), 計画 (月末に残るお金, 今月の予算 = categories with budgets, 貯金 = savings pots, 収入のカテゴリ, 繰り返しの記録).',
      '貯金: pots of money set aside on paper (not accounts). Each has 毎月の貯金 (comes off 月末に残るお金 on 計画) and an optional 目標額. Log with the + button, tab 貯金: 貯金する or 取り崩す.',
      'Entry kinds: 支出, 収入, 振替 (手数料). Logging: the + button (支出を記録). On an entry: 複製, 編集 or この記録を編集, 削除, and 繰り返しを編集 / 繰り返しをやめる for repeating ones.',
      'Spaces: スペース (button at the top: 新しいスペース, 招待コードで参加; each space\'s 設定 has 招待コード, 新しいコード, メンバー, スペースを抜ける, スペースを削除). The personal space is 自分.',
      'Profile (avatar at the top right): 表示名, 言語, テーマ, キャラクター, 削除済み (restore deleted spaces, sources and methods).',
    ].join('\n') : [
      'Screens (bottom tabs): This month (your month so far across every space, your spending by space, Coming up, balance at the end of next month), History (month calendar of entries), Wallet (Sources, Payment methods, Net worth with Savings), Plan (Left at the end of the month, Budgets this month = categories with budgets, Savings = pots, Income categories, Repeating entries).',
      'Savings: pots of money set aside on paper (not accounts). Each has an amount Each month (comes off what is left at the end of the month, on Plan) and an optional Goal. Log with the + button, tab Savings: Save or Take out.',
      'Entry kinds: Expense, Income, Transfer (Fee). Logging: the + button. On an entry: Duplicate, Edit or Edit this entry, Delete, and Edit schedule / Stop repeating for repeating ones.',
      'Spaces: the space button at the top (New space, Join with an invite code; each space\'s settings have the Invite code, New code, Members, Leave space, Delete space). The personal space is "Me".',
      'Profile (avatar at the top right): Your name, Language, Theme, Character, Deleted (restore deleted spaces, sources and methods).',
    ].join('\n'),
    'E-money (PayPay, Suica, …) is a source in 口座・現金 / Sources, charged by a 振替 / Transfer and paid from directly; it is never a payment method. Postpaid services (PayPay あと払い) are set up as credit cards.',
    'Rules: nothing is erased for good except entries and categories; deleted sources, methods, savings pots and spaces can be restored. Every personal space has one fixed cash source whose name and kind cannot change and which cannot be deleted. Only the owner can delete a space or remove members; the owner cannot leave. Members may only rename and recolor a shared space. There is no single reset: starting over means proposing the deletions one by one.',
  ].join('\n')
}
