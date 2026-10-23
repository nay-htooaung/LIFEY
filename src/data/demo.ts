import { addDays, dayInMonth, parts, today } from '../domain/dates'
import { dueOccurrences } from '../domain/recurring'
import type { Category, Entry, Locale, PaymentMethod, Profile, Snapshot, Source, Space, Tone } from '../domain/types'
import { RepoError, uid, type CategoryInput, type NewMethod, type NewSource, type Repo } from './repo'

const KEY = 'lifey-demo-v1'
const ME = 'demo-you'

/** Example data relative to today, so the demo always looks current. */
export function seedDemo(locale: Locale): Snapshot {
  const L = (en: string, ja: string) => (locale === 'ja' ? ja : en)
  const T = today()
  const ago = (n: number) => addDays(T, -n)
  const [y, m] = parts(T)
  const lastMonth = (dom: number) => dayInMonth(y, m - 1, dom)
  const longAgo = addDays(T, -60)

  const profiles: Record<string, Profile> = {
    [ME]: { id: ME, displayName: L('You', 'あなた'), color: '#5EC4B9', locale },
    'demo-sam': { id: 'demo-sam', displayName: 'Sam', color: '#C9A2F2', locale },
    'demo-ren': { id: 'demo-ren', displayName: 'Ren', color: '#F2C76B', locale },
  }
  const spaces: Space[] = [
    { id: 'me', kind: 'personal', name: L('Me', '自分'), tone: 'me', ownerId: ME, inviteCode: null, memberIds: [ME] },
    { id: 'home', kind: 'household', name: L('Our Home', 'わが家'), tone: 'a', ownerId: ME, inviteCode: 'LFY-7Q4K2D', memberIds: [ME, 'demo-sam'] },
    { id: 'trip', kind: 'household', name: L('Kyoto Trip', '京都旅行'), tone: 'b', ownerId: 'demo-ren', inviteCode: 'LFY-K2R9QX', memberIds: [ME, 'demo-sam', 'demo-ren'] },
  ]
  const C = (id: string, spaceId: string, en: string, ja: string, color: string, monthlyBudget: number, kind: Category['kind'] = 'expense', sort = 0): Category =>
    ({ id, spaceId, name: L(en, ja), color, kind, monthlyBudget, sort })
  const categories: Category[] = [
    C('c-food', 'me', 'Food', '食費', '#D0704B', 40000, 'expense', 1), C('c-cof', 'me', 'Coffee', 'カフェ', '#9C7A50', 6000, 'expense', 2),
    C('c-tr', 'me', 'Transport', '交通', '#4A7FC4', 12000, 'expense', 3), C('c-fun', 'me', 'Hobbies', '趣味', '#B05AAA', 15000, 'expense', 4),
    C('c-hl', 'me', 'Health', '医療・健康', '#2F8F7F', 10000, 'expense', 5), C('c-shop', 'me', 'Shopping', '買い物', '#C2566E', 20000, 'expense', 6),
    C('c-sub', 'me', 'Subscriptions', 'サブスク', '#8A6AD8', 6000, 'expense', 7),
    C('c-sal', 'me', 'Salary', '給料', '#6A9C36', 0, 'income', 8), C('c-side', 'me', 'Side work', '副業', '#3F9AB0', 0, 'income', 9),
    C('h-gro', 'home', 'Groceries', '食料品', '#6A9C36', 45000, 'expense', 1), C('h-rent', 'home', 'Rent', '家賃', '#4A7FC4', 140000, 'expense', 2),
    C('h-util', 'home', 'Utilities', '光熱費', '#D3A42A', 15000, 'expense', 3), C('h-hh', 'home', 'Daily goods', '日用品', '#3F9AB0', 8000, 'expense', 4),
    C('h-din', 'home', 'Dining out', '外食', '#D0704B', 20000, 'expense', 5), C('h-pet', 'home', 'Pets', 'ペット', '#B05AAA', 6000, 'expense', 6),
    C('h-con', 'home', 'Contributions', '生活費の入金', '#2F8F7F', 0, 'income', 7),
    C('t-tr', 'trip', 'Travel', '交通', '#4A7FC4', 50000, 'expense', 1), C('t-st', 'trip', 'Lodging', '宿泊', '#8A6AD8', 40000, 'expense', 2),
    C('t-food', 'trip', 'Food', '食事', '#D0704B', 40000, 'expense', 3), C('t-see', 'trip', 'Sightseeing', '観光', '#6A9C36', 20000, 'expense', 4),
  ]
  const S = (id: string, spaceId: string, en: string, ja: string, kind: Source['kind'], openingBalance: number): Source =>
    ({ id, spaceId, name: L(en, ja), kind, openingBalance, createdOn: longAgo })
  const sources: Source[] = [
    S('chk', 'me', 'Everyday account', '普段使いの口座', 'bank', 380000), S('sav', 'me', 'Savings', '貯金口座', 'savings', 1250000),
    S('cash', 'me', 'Wallet cash', '財布の現金', 'cash', 18000), S('joint', 'home', 'Joint account', '共同口座', 'bank', 160000),
    S('jar', 'home', 'Household envelope', '生活費の封筒', 'cash', 12000), S('tcash', 'trip', 'Trip wallet', '旅行用の財布', 'cash', 30000),
  ]
  const M = (id: string, spaceId: string, en: string, ja: string, kind: PaymentMethod['kind'], sourceId: string, credit?: [number, number, number]): PaymentMethod =>
    ({ id, spaceId, name: L(en, ja), kind, sourceId, creditLimit: credit?.[0] ?? null, limitSharedWith: null, closingDay: credit?.[1] ?? null, paymentDay: credit?.[2] ?? null })
  const methods: PaymentMethod[] = [
    M('m-cash', 'me', 'Cash', '現金', 'cash', 'cash'), M('m-deb', 'me', 'Debit ••4421', 'デビット ••4421', 'debit', 'chk'),
    M('m-pp', 'me', 'PayPay', 'PayPay', 'emoney', 'chk'), M('m-suica', 'me', 'Suica', 'Suica', 'emoney', 'chk'),
    M('m-cc', 'me', 'Visa ••9012', 'Visa ••9012', 'credit', 'chk', [500000, 15, 10]),
    M('m-jdeb', 'home', 'Joint debit ••7730', '共同デビット ••7730', 'debit', 'joint'),
    M('m-jcc', 'home', 'Family card ••5518', '家族カード ••5518', 'credit', 'joint', [800000, 31, 27]),
    M('m-jcash', 'home', 'Envelope cash', '封筒の現金', 'cash', 'jar'), M('m-tcash', 'trip', 'Trip wallet', '旅行用の財布', 'cash', 'tcash'),
  ]
  const entries: Entry[] = []
  const e = (spaceId: string, occurredOn: string, kind: Entry['kind'], amount: number, categoryId: string, via: string, en: string, ja: string, x: Partial<Entry> = {}) =>
    entries.push({
      id: uid(), spaceId, kind, amount, categoryId, methodId: kind === 'expense' && via !== 'hidden' ? via : null,
      sourceId: kind === 'income' ? via : null, occurredOn, note: L(en, ja), tags: [], repeat: 'none', repeatOf: null, createdBy: ME, ...x,
    })
  const hidden = 'hidden' // paid from another member's personal funds: no method we can see
  // personal
  e('me', lastMonth(25), 'income', 320000, 'c-sal', 'chk', 'Salary', '給料', { repeat: 'monthly' })
  e('me', lastMonth(28), 'expense', 3000, 'c-sub', 'm-cc', 'Phone plan', '携帯料金', { repeat: 'monthly' })
  e('me', lastMonth(5), 'expense', 1080, 'c-sub', 'm-cc', 'Music streaming', '音楽配信', { repeat: 'monthly' })
  e('me', lastMonth(30), 'expense', 7700, 'c-hl', 'm-cc', 'Gym membership', 'ジム会費', { repeat: 'monthly' })
  const daily: [number, number, string, string, string, string, string[]?][] = [
    [21, 980, 'c-food', 'm-deb', 'Ramen lunch', 'ラーメンランチ'], [20, 520, 'c-cof', 'm-cash', 'Café latte', 'カフェラテ'],
    [19, 8800, 'c-shop', 'm-cc', 'Running shoes', 'ランニングシューズ', ['treat']], [17, 480, 'c-tr', 'm-suica', 'Train', '電車'],
    [16, 450, 'c-cof', 'm-cash', 'Konbini coffee', 'コンビニコーヒー'], [15, 4200, 'c-food', 'm-cc', 'Dinner with Yui', 'ゆいと夕食', ['friends']],
    [13, 1900, 'c-fun', 'm-cc', 'Movie', '映画'], [12, 520, 'c-cof', 'm-cash', 'Café latte', 'カフェラテ'],
    [11, 3600, 'c-hl', 'm-deb', 'Pharmacy', '薬局'], [10, 1280, 'c-food', 'm-pp', 'Bento', 'お弁当'],
    [8, 2400, 'c-tr', 'm-cc', 'Taxi home', 'タクシー'], [7, 680, 'c-cof', 'm-pp', 'Coffee + croissant', 'コーヒーとクロワッサン'],
    [6, 3300, 'c-fun', 'm-cc', 'Bouldering day pass', 'ボルダリング', ['hobby']], [5, 1100, 'c-food', 'm-pp', 'Sushi lunch', '寿司ランチ'],
    [4, 520, 'c-cof', 'm-cash', 'Café latte', 'カフェラテ'], [3, 12800, 'c-shop', 'm-cc', 'Rain jacket', 'レインジャケット'],
    [2, 1560, 'c-food', 'm-pp', 'Onigiri & salad', 'おにぎりとサラダ'], [1, 450, 'c-cof', 'm-cash', 'Konbini coffee', 'コンビニコーヒー'],
    [1, 1200, 'c-food', 'm-cc', 'Curry', 'カレー'],
  ]
  for (const [n, amt, cat, via, en, ja, tags] of daily) e('me', ago(n), 'expense', amt, cat, via, en, ja, { tags: tags ?? [] })
  e('me', ago(9), 'income', 18000, 'c-side', 'chk', 'Logo design job', 'ロゴ制作')
  // Our Home
  e('home', lastMonth(25), 'income', 150000, 'h-con', 'joint', 'My contribution', '生活費（自分）', { repeat: 'monthly' })
  e('home', lastMonth(25), 'income', 150000, 'h-con', 'joint', "Sam's contribution", '生活費（Sam）', { repeat: 'monthly', createdBy: 'demo-sam' })
  e('home', lastMonth(27), 'expense', 140000, 'h-rent', 'm-jdeb', 'Rent', '家賃', { repeat: 'monthly' })
  e('home', lastMonth(14), 'expense', 9800, 'h-util', 'm-jdeb', 'Electricity', '電気代', { repeat: 'monthly' })
  const home: [number, number, string, string, string, string, string][] = [
    [20, 8640, 'h-gro', 'm-jcc', 'Weekly shop', '週末のまとめ買い', 'demo-sam'], [18, 4600, 'h-din', 'm-cc', 'Brunch', 'ブランチ', ME],
    [16, 1280, 'h-hh', 'm-jcash', 'Dish soap, sponges', '洗剤・スポンジ', ME], [13, 7350, 'h-gro', 'm-jcc', 'Weekly shop', '週末のまとめ買い', ME],
    [12, 3980, 'h-pet', hidden, 'Cat food & litter', '猫のごはん・砂', 'demo-sam'], [8, 3200, 'h-din', hidden, 'Thai takeout', 'タイ料理テイクアウト', 'demo-sam'],
    [6, 9120, 'h-gro', 'm-jcc', 'Weekly shop', '週末のまとめ買い', 'demo-sam'], [4, 2980, 'h-hh', 'm-deb', 'Shower curtain', 'シャワーカーテン', ME],
    [3, 1850, 'h-gro', hidden, 'Farmers market', 'マルシェ', 'demo-sam'], [2, 5400, 'h-din', 'm-pp', 'Pizza night', 'ピザの日', ME],
  ]
  for (const [n, amt, cat, via, en, ja, by] of home) e('home', ago(n), 'expense', amt, cat, via, en, ja, { createdBy: by })
  // Kyoto Trip: everyone pays their own way
  const trip: [number, number, string, string, string, string, string][] = [
    [26, 14170, 't-tr', 'm-cc', 'Shinkansen to Kyoto', '新幹線（京都まで）', ME], [26, 14170, 't-tr', hidden, 'Shinkansen to Kyoto', '新幹線（京都まで）', 'demo-sam'],
    [26, 14170, 't-tr', hidden, 'Shinkansen to Kyoto', '新幹線（京都まで）', 'demo-ren'], [26, 36000, 't-st', hidden, 'Machiya stay, 2 nights', '町家ステイ 2泊', 'demo-ren'],
    [25, 4800, 't-food', 'm-tcash', 'Udon lunch', 'うどんランチ', ME], [25, 1200, 't-see', 'm-tcash', 'Kiyomizu-dera entry', '清水寺 拝観料', 'demo-sam'],
    [25, 9600, 't-food', hidden, 'Kaiseki dinner', '京料理の夕食', 'demo-sam'], [24, 2100, 't-food', 'm-pp', 'Matcha sweets', '抹茶スイーツ', ME],
    [24, 2100, 't-tr', 'm-tcash', 'Bus day passes', 'バス一日券', 'demo-ren'],
  ]
  for (const [n, amt, cat, via, en, ja, by] of trip) e('trip', ago(n), 'expense', amt, cat, via, en, ja, { createdBy: by })

  const snap: Snapshot = {
    me: profiles[ME], profiles, spaces, sources, methods, categories, entries, flows: [],
    noSpendDays: [ago(14)],
  }
  return withFlows(snap)
}

function withFlows(s: Snapshot): Snapshot {
  return {
    ...s,
    flows: s.entries.map((e) => ({ methodId: e.methodId, sourceId: e.sourceId, kind: e.kind, amount: e.amount, occurredOn: e.occurredOn })),
  }
}

function read(): Snapshot | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Snapshot) : null
  } catch {
    return null
  }
}

export function createDemoRepo(locale: Locale): Repo & { reset(locale: Locale): void } {
  let snap = read() ?? seedDemo(locale)
  const listeners = new Set<() => void>()
  const commit = (next: Snapshot) => {
    snap = withFlows(next)
    try {
      localStorage.setItem(KEY, JSON.stringify(snap))
    } catch {
      /* storage full or blocked: keep working in memory */
    }
  }
  commit(snap)
  const tones: Tone[] = ['a', 'b', 'c', 'd']

  return {
    mode: 'demo',
    async load() {
      // the other demo members "post" their own repeating entries too
      const others = Object.keys(snap.profiles).filter((id) => id !== ME)
      const due = others.flatMap((id) => dueOccurrences(snap.entries, id, today()).map((e) => ({ ...e, id: uid(), createdBy: id })))
      if (due.length) commit({ ...snap, entries: [...snap.entries, ...due] })
      return structuredClone(snap)
    },
    async addEntries(list) {
      commit({ ...snap, entries: [...snap.entries, ...list.map((e) => ({ ...e, id: uid(), createdBy: ME }))] })
    },
    async updateEntry(id, entry) {
      commit({ ...snap, entries: snap.entries.map((e) => (e.id === id ? { ...e, ...entry, id, createdBy: e.createdBy } : e)) })
    },
    async deleteEntry(id) {
      commit({ ...snap, entries: snap.entries.filter((e) => e.id !== id) })
    },
    async addSource(s: NewSource) {
      const id = uid()
      commit({ ...snap, sources: [...snap.sources, { ...s, id, createdOn: today() }] })
      return id
    },
    async addMethod(m: NewMethod) {
      const id = uid()
      commit({ ...snap, methods: [...snap.methods, { ...m, id }] })
      return id
    },
    async updateMethod(id: string, m: NewMethod) {
      commit({ ...snap, methods: snap.methods.map((x) => (x.id === id ? { ...m, id } : x)) })
    },
    async saveCategory(c: CategoryInput) {
      const id = c.id ?? uid()
      const cats = c.id ? snap.categories.map((x) => (x.id === c.id ? { ...x, ...c, id } : x)) : [...snap.categories, { ...c, id }]
      commit({ ...snap, categories: cats })
      return id
    },
    async archiveCategory(id) {
      commit({ ...snap, categories: snap.categories.filter((c) => c.id !== id) })
    },
    async createHousehold(name, tone) {
      const id = uid()
      const code = 'LFY-' + Math.random().toString(36).slice(2, 8).toUpperCase()
      const L = (en: string, ja: string) => (snap.me.locale === 'ja' ? ja : en)
      const cats: Category[] = [
        { id: uid(), spaceId: id, name: L('Groceries', '食料品'), color: '#6A9C36', kind: 'expense', monthlyBudget: 0, sort: 1 },
        { id: uid(), spaceId: id, name: L('Daily goods', '日用品'), color: '#3F9AB0', kind: 'expense', monthlyBudget: 0, sort: 2 },
        { id: uid(), spaceId: id, name: L('Dining out', '外食'), color: '#D0704B', kind: 'expense', monthlyBudget: 0, sort: 3 },
        { id: uid(), spaceId: id, name: L('Contributions', '生活費の入金'), color: '#2F8F7F', kind: 'income', monthlyBudget: 0, sort: 4 },
      ]
      const t = tone ?? tones[snap.spaces.length % tones.length]
      commit({
        ...snap,
        spaces: [...snap.spaces, { id, kind: 'household', name, tone: t, ownerId: ME, inviteCode: code, memberIds: [ME] }],
        categories: [...snap.categories, ...cats],
      })
      return id
    },
    async joinHousehold() {
      throw new RepoError('bad_invite', 'Joining needs an account. Demo mode keeps everything on this device.')
    },
    async leaveHousehold(spaceId) {
      commit({
        ...snap,
        spaces: snap.spaces.filter((s) => s.id !== spaceId),
        entries: snap.entries.filter((e) => e.spaceId !== spaceId),
      })
    },
    async markNoSpend(day) {
      commit({ ...snap, noSpendDays: [...new Set([...snap.noSpendDays, day])] })
    },
    async updateProfile(patch) {
      const me = { ...snap.me, ...patch }
      commit({ ...snap, me, profiles: { ...snap.profiles, [me.id]: me } })
    },
    async signOut() {},
    subscribe(cb) {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    reset(loc) {
      commit(seedDemo(loc))
    },
  }
}

export type DemoRepo = ReturnType<typeof createDemoRepo>
