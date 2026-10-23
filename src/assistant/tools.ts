// What the assistant can do, shared by the Worker (which sends it to the model) and the app (which runs it).
// Tools run in the app with the signed-in person's own data, so the model sees only what they can see.
// Nothing here saves: propose_* tools put changes in a tray that the person applies themselves.

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
}

export const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_overview',
      description: 'Spaces, sources with balances today, payment methods (cards with what is owed), and categories with budgets and spending this month. Call this first to learn ids.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_entries',
      description: 'Entries in one month that the person can see, newest first.',
      parameters: {
        type: 'object',
        properties: { month: str('YYYY-MM'), space_id: str('Only this space. Omit for every space.'), text: str('Only entries whose name, note or category contains this.') },
        required: ['month'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'coming_up',
      description: 'Repeating bills, income, transfers and card payments due in the next 45 days for a space.',
      parameters: { type: 'object', properties: { space_id: str('Defaults to the current space.') } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_entry',
      description: 'Propose a new entry. It is not saved: the person reviews it and applies it.',
      parameters: { type: 'object', properties: entryFields, required: ['kind', 'amount', 'date'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_edit',
      description: 'Propose changing an existing entry. Give only the fields that change. Not for repeating entries.',
      parameters: { type: 'object', properties: { entry_id: str('From list_entries.'), ...entryFields }, required: ['entry_id'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_delete',
      description: 'Propose deleting an entry. Not for repeating entries.',
      parameters: { type: 'object', properties: { entry_id: str('From list_entries.') }, required: ['entry_id'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ask_user',
      description: 'Ask the person one short question with 2-6 tappable answers when something is unclear. They may also type their own answer.',
      parameters: {
        type: 'object',
        properties: { question: str('One short question.'), options: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 6 } },
        required: ['question', 'options'],
      },
    },
  },
] as const

export type ToolName = (typeof TOOLS)[number]['function']['name']

export function systemPrompt(c: ChatContext): string {
  return [
    'You are the assistant inside Lifey, a household money app for a person and the people they live with.',
    `Today is ${c.today}. The person is looking at the space "${c.space.name}" (id ${c.space.id}).`,
    `Reply in ${c.locale === 'ja' ? 'Japanese' : 'English'}, in plain short sentences without Markdown.`,
    'Money is whole yen. Dates are YYYY-MM-DD in Japan time.',
    'Use the tools to look things up; never guess ids, balances or entries.',
    'You cannot save anything yourself. To log, fix or delete, call propose_entry, propose_edit or propose_delete:',
    'each puts one change in a tray that the person checks and applies. Then say briefly what you proposed.',
    'If a tool returns an error, fix the arguments and try again, or ask.',
    'When something needed is missing or unclear (amount, how it was paid, which entry), call ask_user with likely answers',
    'taken from their real data, such as their payment method names. Do not ask about things you can look up.',
    'Repeating entries and schedules cannot be changed here; tell them to use Edit schedule in the app.',
    'Other members\' personal accounts are hidden from the person and from you; never try to reveal them.',
  ].join('\n')
}
