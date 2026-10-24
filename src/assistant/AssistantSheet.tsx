import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { changeImpact, type Change } from '../domain/changes'
import { asNew } from '../domain/recurring'
import type { Entry, NewEntry } from '../domain/types'
import { useI18n, yen } from '../i18n'
import { toneVar, useLookups, usePersonName, useStore, useSubmit } from '../data/store'
import { supabase } from '../data/supabase'
import { EntrySheet } from '../sheets/EntrySheet'
import { Glyph } from '../ui/bits'
import { usePaidWith } from '../ui/entry'
import { IconChevron, IconSend, IconSpark, IconUndo, IconX } from '../ui/icons'
import { Select } from '../ui/Select'
import { useUI } from '../ui/ui'
import { ChatError, readStream, runTool, trimHistory, within, type ApiMsg, type ToolCtx } from './run'
import type { ChatContext } from './tools'

/** What the chat shows. The conversation sent to the model is kept separately (ApiMsg). */
type Msg =
  | { id: number; role: 'user'; text: string }
  | { id: number; role: 'ai'; text: string }
  /** What the assistant looked at, as a quiet line. */
  | { id: number; role: 'tool'; text: string }
  /** A question with tappable answers; `answer` is set once answered. */
  | { id: number; role: 'ask'; text: string; options: string[]; answer?: string }
  /** Applied changes, with what Undo needs: the ids the new entries got. */
  | { id: number; role: 'receipt'; changes: Change[]; added: string[]; undone?: boolean }
  | { id: number; role: 'error'; text: string }

type NewMsg = Msg extends infer M ? (M extends Msg ? Omit<M, 'id'> : never) : never

/** A proposed change in the tray; `skip` leaves it out when applying. */
type Pending = Change & { skip?: boolean }

interface ModelList { models: { id: string; name: string }[]; recommended: string | null }

interface Assistant {
  msgs: Msg[]
  /** The free models the Worker offers, once loaded; null before or when it cannot say. */
  models: ModelList | null
  /** The model picked on this device, or the recommended one. */
  model: string | null
  setModel(id: string): void
  tray: Pending[]
  thinking: boolean
  /** A typed message, or the answer to the open question. */
  send(text: string): void
  retry(): void
  setTray(fn: (tray: Pending[]) => Pending[]): void
  /** Moves the applied changes from the tray into a receipt in the chat. */
  applied(changes: Change[], added: string[], leftOut: number): void
  discarded(): void
  undone(receiptId: number): void
  reset(): void
}

const Ctx = createContext<Assistant | null>(null)
const useAssistant = () => {
  const a = useContext(Ctx)
  if (!a) throw new Error('useAssistant outside AssistantProvider')
  return a
}

const MODEL_KEY = 'lifey-ai-model'
const readModel = () => {
  try {
    return localStorage.getItem(MODEL_KEY)
  } catch {
    return null
  }
}

let nextId = 1
/** Model calls per message, so a confused loop stops. */
const MAX_STEPS = 8

/** Keeps the conversation while the sheet is closed, and runs the model's tool calls on the person's own data. */
export function AssistantProvider({ children }: { children: ReactNode }) {
  const { snap, repo, space, today } = useStore()
  const { t, locale } = useI18n()
  const person = usePersonName()
  const paidLabel = usePaidWith()
  const paidWith = (e: Entry) => paidLabel(e).label
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [tray, setTray] = useState<Pending[]>([])
  const [thinking, setThinking] = useState(false)
  const [models, setModels] = useState<ModelList | null>(null)
  const [picked, setPicked] = useState(readModel)
  // the pick stays while it is still offered; otherwise the recommended one
  const model = models?.models.some((m) => m.id === picked) ? picked : (models?.recommended ?? picked)
  const modelRef = useRef(model)
  modelRef.current = model
  const history = useRef<ApiMsg[]>([])
  // the open ask_user call, answered by the next message
  const asking = useRef<{ callId: string; msgId: number } | null>(null)
  // what happened in the app since the last message (applied, discarded), told to the model with the next one
  const notes = useRef<string[]>([])
  const seen = useRef(new Map<string, Entry>())
  const live = useRef({ snap, repo, space, today, person, paidWith, t, locale })
  live.current = { snap, repo, space, today, person, paidWith, t, locale }
  // a new chat drops replies still on their way
  const turn = useRef(0)
  const abort = useRef<AbortController | null>(null)

  // the list is asked for once, when the provider starts
  useEffect(() => {
    let live = true
    fetch('/api/models')
      .then((r) => (r.ok ? (r.json() as Promise<ModelList>) : null))
      .then((list) => live && list?.models.length && setModels(list))
      .catch(() => { /* the Worker picks the recommended one */ })
    return () => {
      live = false
    }
  }, [])

  const add = useCallback((m: NewMsg) => {
    const id = nextId++
    setMsgs((x) => [...x, { ...m, id } as Msg])
    return id
  }, [])

  const run = useCallback(async () => {
    const n = turn.current
    const ctl = new AbortController()
    abort.current = ctl
    setThinking(true)
    const L = () => live.current
    try {
      for (let step = 0; step < MAX_STEPS; step++) {
        // the Worker checks who is asking; without a session (demo mode) it answers signed_out
        // each wait has a limit, so a stuck step ends in an error with its code instead of loading forever
        const token = supabase ? (await within(supabase.auth.getSession(), 10_000, 'session_timeout')).data.session?.access_token : undefined
        const context: ChatContext = { today: L().today, locale: L().locale, space: { id: L().space.id, name: L().space.name } }
        const res = await within(fetch('/api/chat', {
          method: 'POST', signal: ctl.signal,
          headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ messages: trimHistory(history.current), context, model: modelRef.current ?? undefined }),
        }), 90_000, 'request_timeout')
        if (!res.ok || !res.body) throw new ChatError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'model')
        let aiId: number | null = null
        const out = await readStream(res.body, (text) => {
          if (turn.current !== n) return
          if (aiId === null) aiId = add({ role: 'ai', text })
          else setMsgs((x) => x.map((m) => (m.id === aiId ? { ...m, text } : m)))
        })
        if (turn.current !== n) return
        history.current.push({ role: 'assistant', content: out.text || null, ...(out.toolCalls.length ? { tool_calls: out.toolCalls } : {}) })
        if (!out.toolCalls.length) return

        const ctx: ToolCtx = { ...L(), seen: seen.current }
        let asked = false
        for (const call of out.toolCalls) {
          if (call.function.name === 'ask_user') {
            let q: { question?: unknown; options?: unknown } = {}
            try {
              q = JSON.parse(call.function.arguments)
            } catch { /* answered below */ }
            const options = Array.isArray(q.options) ? q.options.map(String).slice(0, 6) : []
            if (asked || typeof q.question !== 'string' || !options.length) {
              history.current.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify({ error: asked ? 'ask one question at a time' : 'needs question and options' }) })
              continue
            }
            asked = true
            asking.current = { callId: call.id, msgId: add({ role: 'ask', text: q.question, options }) }
            continue
          }
          const r = await runTool(call.function.name, call.function.arguments, ctx)
          if (turn.current !== n) return
          history.current.push({ role: 'tool', tool_call_id: call.id, content: r.content })
          if (r.change) setTray((x) => [...x, r.change!])
          const label = toolLabel(call.function.name, call.function.arguments, r.content, L().t)
          if (label) add({ role: 'tool', text: label })
        }
        // the answer to the question goes back as the tool's result, with the next message
        if (asked) return
      }
    } catch (e) {
      if (turn.current !== n || ctl.signal.aborted) return
      if (e instanceof ChatError) ctl.abort()
      const code = e instanceof ChatError ? e.code : navigator.onLine ? (e instanceof Error ? e.name : 'unknown') : 'offline'
      const { t } = L()
      add({
        role: 'error',
        text: code === 'signed_out' ? t('aiErrSignedOut') : code === 'daily_limit' ? t('aiErrLimit') : code === 'model_busy' ? t('aiErrBusy')
          : code === 'not_configured' ? t('aiErrSetup') : code === 'offline' ? t('offline')
          // the code says where it went wrong, for fixing it
          : `${t('aiErr')} (${code})`,
      })
    } finally {
      if (turn.current === n) setThinking(false)
    }
  }, [add])

  const value = useMemo<Assistant>(() => ({
    msgs, tray, thinking, setTray, models, model,
    setModel(id) {
      setPicked(id)
      try {
        localStorage.setItem(MODEL_KEY, id)
      } catch {
        /* ignore */
      }
    },
    send(text) {
      const said = text.trim()
      if (!said || thinking) return
      const ask = asking.current
      asking.current = null
      if (ask) {
        setMsgs((x) => x.map((m) => (m.id === ask.msgId && m.role === 'ask' ? { ...m, answer: said } : m)))
        history.current.push({ role: 'tool', tool_call_id: ask.callId, content: JSON.stringify({ answer: said }) })
        if (notes.current.length) history.current.push({ role: 'user', content: notes.current.join('\n') })
      } else {
        history.current.push({ role: 'user', content: [...notes.current, said].join('\n') })
      }
      notes.current = []
      add({ role: 'user', text: said })
      void run()
    },
    retry() {
      if (thinking) return
      setMsgs((x) => (x.at(-1)?.role === 'error' ? x.slice(0, -1) : x))
      void run()
    },
    applied(changes, added, leftOut) {
      setTray([])
      add({ role: 'receipt', changes, added })
      notes.current.push(`[app] The person applied ${changes.length} proposed change(s)${leftOut ? ` and left out ${leftOut}` : ''}.`)
    },
    discarded() {
      setTray([])
      notes.current.push('[app] The person discarded the proposed changes.')
    },
    undone(id) {
      setMsgs((x) => x.map((m) => (m.id === id && m.role === 'receipt' ? { ...m, undone: true } : m)))
      notes.current.push('[app] The person undid the changes they had applied.')
    },
    reset() {
      turn.current++
      abort.current?.abort()
      history.current = []
      asking.current = null
      notes.current = []
      seen.current.clear()
      setMsgs([])
      setTray([])
      setThinking(false)
    },
  }), [msgs, tray, thinking, run, add, models, model])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** A quiet line saying what the assistant looked at. Proposals show in the tray instead; failed calls show nothing. */
function toolLabel(name: string, args: string, result: string, t: ReturnType<typeof useI18n>['t']): string | null {
  if (result.startsWith('{"error"')) return null
  if (name === 'get_overview') return t('aiReadOverview')
  if (name === 'coming_up') return t('aiReadComing')
  if (name === 'list_entries') {
    let month = ''
    try {
      month = String(JSON.parse(args).month ?? '')
    } catch { /* no month */ }
    const [y, m] = month.split('-').map(Number)
    return y && m ? t('aiReadMonth', { y, m }) : null
  }
  return null
}

export function AssistantSheet() {
  const a = useAssistant()
  const { t } = useI18n()
  const [text, setText] = useState('')
  const end = useRef<HTMLDivElement>(null)
  const lastAsk = [...a.msgs].reverse().find((m) => m.role === 'ask')
  const last = a.msgs.at(-1)

  // the newest message stays in view; the footer is last in the sheet, so scrolling to the end shows both
  useEffect(() => {
    const body = end.current?.closest('.sheet-body')
    body?.scrollTo({ top: body.scrollHeight, behavior: 'smooth' })
  }, [a.msgs.length, last?.role === 'ai' ? last.text.length : 0, a.thinking, a.tray.length])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim() || a.thinking) return
    a.send(text)
    setText('')
  }

  return (
    <div className="chat">
      <div className="chat-h">
        <h2>{t('assistant')}</h2>
        {a.msgs.length > 0 && <button className="link" onClick={a.reset}>{t('newChat')}</button>}
      </div>
      {a.models && a.model && (
        <div className="chat-model">
          <label className="pick-l" htmlFor="ai-model">{t('aiModel')}</label>
          <Select id="ai-model" value={a.model} onChange={a.setModel}
            options={a.models.models.map((m) => ({ value: m.id, label: m.name, hint: m.id === a.models!.recommended ? t('recommended') : undefined }))} />
        </div>
      )}

      <div className="chat-log">
        <AiBubble>{t('aiHello')}</AiBubble>
        <p className="chat-note">{t('aiFreeNote')}</p>
        {a.msgs.map((m) =>
          m.role === 'user' ? <div key={m.id} className="bub me">{m.text}</div>
          : m.role === 'ai' ? <AiBubble key={m.id}>{m.text}</AiBubble>
          : m.role === 'tool' ? <div key={m.id} className="chat-tool">✓ {m.text}</div>
          : m.role === 'error' ? (
            <div key={m.id} className="chat-err" role="alert">
              <span>{m.text}</span>
              {m === last && <button className="link" onClick={a.retry}>{t('tryAgain')}</button>}
            </div>
          )
          : m.role === 'ask' ? (
            <div key={m.id} className="ask">
              <AiBubble>{m.text}</AiBubble>
              <div className="chips wrap" role="group" aria-label={m.text}>
                {m.options.map((o) => (
                  <button key={o} className="chip" aria-pressed={m.answer === o}
                    disabled={!!m.answer || m !== lastAsk || a.thinking} onClick={() => a.send(o)}>{o}</button>
                ))}
              </div>
            </div>
          )
          : <Receipt key={m.id} msg={m} />,
        )}
        {a.thinking && last?.role !== 'ai' && <div className="typing" role="status" aria-label={t('thinking')}><i /><i /><i /></div>}
        <div ref={end} />
      </div>

      <div className="chat-foot">
        {a.tray.length > 0 && <Tray />}
        <form className="composer" onSubmit={submit}>
          <input className="input" value={text} maxLength={500} placeholder={t('askPh')} aria-label={t('askPh')}
            enterKeyHint="send" onChange={(e) => setText(e.target.value)} />
          <button className="send" aria-label={t('send')} disabled={!text.trim() || a.thinking}><IconSend /></button>
        </form>
      </div>
    </div>
  )
}

function AiBubble({ children }: { children: ReactNode }) {
  return (
    <div className="bub ai">
      <span className="ai-av" aria-hidden="true"><IconSpark /></span>
      <span>{children}</span>
    </div>
  )
}

const sameEntry = (e: Entry, n: NewEntry) =>
  e.spaceId === n.spaceId && e.kind === n.kind && e.amount === n.amount && e.occurredOn === n.occurredOn && e.methodId === n.methodId && e.sourceId === n.sourceId

/** The changes waiting for the person: each as an entry row, what they move, and a hold-to-apply button. */
function Tray() {
  const a = useAssistant()
  const { snap, space } = useStore()
  const { submit, pending, busy } = useSubmit()
  const ui = useUI()
  const { t } = useI18n()
  const [open, setOpen] = useState(true)
  // new proposals open the tray again
  const count = a.tray.length
  useEffect(() => setOpen(true), [count])
  const live = a.tray.filter((c) => !c.skip)

  const edit = (c: Pending) => {
    if (c.op === 'delete') return
    ui.push(<EntrySheet prefill={c.after} onDraft={(after) => a.setTray((tr) => tr.map((x) => (x.key === c.key ? { ...x, after } as Pending : x)))} />, toneVar(space))
  }

  const apply = async () => {
    const known = new Set(snap.entries.map((e) => e.id))
    const r = await submit('apply', async (repo) => {
      for (const c of live) {
        if (c.op === 'add') await repo.addEntries([c.after])
        else if (c.op === 'edit') await repo.updateEntry(c.before.id, c.after)
        else await repo.deleteEntry(c.before.id)
      }
      // what Undo needs: the ids the new entries got
      const adds = live.flatMap((c) => (c.op === 'add' ? [c.after] : []))
      if (!adds.length) return []
      const fresh = (await repo.load()).entries.filter((e) => !known.has(e.id))
      return adds.flatMap((n) => fresh.filter((e) => sameEntry(e, n)).slice(0, 1).map((e) => e.id))
    }, t('appliedN', { n: live.length }))
    if (r?.ok) a.applied(live.map(({ skip: _s, ...c }) => c as Change), r.value, a.tray.length - live.length)
  }

  const n = live.length
  return (
    <section className="tray" aria-label={n === 1 ? t('change1') : t('changesN', { n })}>
      <button className="tray-h" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="tray-n">{a.tray.length}</span>
        <b>{a.tray.length === 1 ? t('change1') : t('changesN', { n: a.tray.length })}</b>
        <IconChevron />
      </button>
      {open && (
        <div className="tray-b">
          <div className="ch-list">
            {a.tray.map((c) => (
              <ChangeRow key={c.key} c={c} onEdit={() => edit(c)}
                onSkip={() => a.setTray((tr) => tr.map((x) => (x.key === c.key ? { ...x, skip: !x.skip } : x)))} />
            ))}
          </div>
          {a.tray.some((c) => c.op !== 'delete') && <p className="chat-note">{t('tapToEdit')}</p>}
          <Impact changes={live} />
        </div>
      )}
      {open && (
        <div className="btn-row tray-act">
          <button className="btn" disabled={busy} onClick={a.discarded}>{t('discard')}</button>
          <HoldButton label={`${t('holdApply')} · ${n}`} disabled={!n || busy} busy={pending === 'apply'} onHold={apply} />
        </div>
      )}
    </section>
  )
}

function ChangeRow({ c, onEdit, onSkip }: { c: Pending; onEdit(): void; onSkip(): void }) {
  const { snap, today } = useStore()
  const { cat } = useLookups()
  const { t, dateShort } = useI18n()
  const paidWith = usePaidWith()
  const now: Entry = c.op === 'delete' ? c.before : { ...c.after, id: '', createdBy: c.op === 'edit' ? c.before.createdBy : snap.me.id }
  const was = c.op === 'edit' ? c.before : undefined
  const k = now.categoryId ? cat.get(now.categoryId) : undefined
  const title = now.name || now.note || (now.kind === 'transfer' ? t('transfer') : k?.name) || '—'
  const when = (d: string) => (d === today ? t('today') : dateShort(d))
  const via = paidWith(now).label
  const viaWas = was && paidWith(was).label
  const sign = now.kind === 'expense' ? '-' : now.kind === 'income' ? '+' : ''
  const [op, tone] = c.op === 'add' ? [t('opAdd'), 'pos'] : c.op === 'edit' ? [t('opEdit'), 'warn'] : [t('opDel'), 'neg']
  return (
    <div className={`ch ${c.op}` + (c.skip ? ' skip' : '')}>
      <button className="ch-main" disabled={c.op === 'delete' || c.skip} onClick={onEdit}>
        <Glyph category={now.kind === 'transfer' ? { name: '⇄', color: 'var(--card-2)' } : k} />
        <div className="main">
          <div className="t"><span className={`pill ${tone}`}>{c.skip ? t('leftOut') : op}</span> <span className="ch-t">{title}</span></div>
          <div className="s">
            {viaWas && viaWas !== via && <><s>{viaWas}</s>→</>}
            <span className="ch-via">{via}</span>
            <span>·</span>
            {was && was.occurredOn !== now.occurredOn && <><s>{when(was.occurredOn)}</s>→</>}
            <span>{when(now.occurredOn)}</span>
          </div>
        </div>
        <span className="amt num">
          {was && was.amount !== now.amount && <s>{yen(was.amount)}</s>}
          <span className={now.kind === 'income' ? 'amt-in' : ''}>{sign}{yen(now.amount)}</span>
        </span>
      </button>
      <button className="ch-x" aria-label={c.skip ? t('putBack') : t('leaveOut')} onClick={onSkip}>{c.skip ? <IconUndo /> : <IconX />}</button>
    </div>
  )
}

/** What the changes do to balances, cards and budgets, before and after. */
function Impact({ changes }: { changes: Change[] }) {
  const { snap, today } = useStore()
  const { source, method, cat } = useLookups()
  const { t } = useI18n()
  const rows = changeImpact(snap, changes, today)
  if (!rows.length) return null
  return (
    <div className="impact">
      <div className="label">{t('afterApply')}</div>
      {rows.map((r) => {
        const c = r.kind === 'category' ? cat.get(r.id) : undefined
        const name = r.kind === 'source' ? source.get(r.id)?.name : r.kind === 'card' ? `${method.get(r.id)?.name} · ${t('owed')}` : c?.name
        // more money in a source is good; more owed on a card or spent in a category is not
        const good = r.kind === 'source' ? r.after > r.before : r.after < r.before
        const delta = r.after - r.before
        const budget = c?.monthlyBudget ?? 0
        const w = (n: number) => `${Math.max(0, Math.min(100, (n / budget) * 100))}%`
        return (
          <div key={r.kind + r.id} className="imp">
            <div className="imp-top">
              <span className="imp-nm">{name}</span>
              <span className="num imp-v">
                <span className="muted">{yen(r.before)}</span> → <b>{yen(r.after)}</b>
                <span className={'imp-d ' + (good ? 'amt-in' : 'neg')}>{delta > 0 ? '+' : ''}{yen(delta)}</span>
              </span>
            </div>
            {budget > 0 && (
              <div className="imp-bar">
                <div className="bar">
                  <i style={{ width: w(Math.min(r.before, r.after)), background: c!.color }} />
                  <i className={'ghost' + (delta < 0 ? ' less' : '')} style={{ width: w(Math.abs(delta)), '--c': c!.color } as CSSProperties} />
                </div>
                <span className="tiny muted num">{t('ofBudgetX', { a: yen(budget) })}</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const HOLD_MS = 700

/** Applies only after a press held for HOLD_MS, so a stray tap never changes money. */
function HoldButton({ label, onHold, disabled, busy }: { label: string; onHold(): void; disabled?: boolean; busy?: boolean }) {
  const { t } = useI18n()
  const [holding, setHolding] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const start = () => {
    if (disabled || holding) return
    setHolding(true)
    timer.current = setTimeout(() => {
      setHolding(false)
      navigator.vibrate?.(20)
      onHold()
    }, HOLD_MS)
  }
  const stop = () => {
    clearTimeout(timer.current)
    setHolding(false)
  }
  useEffect(() => () => clearTimeout(timer.current), [])
  return (
    <button className={'btn primary hold' + (holding ? ' on' : '')} disabled={disabled} aria-busy={busy}
      style={{ '--hold': `${HOLD_MS}ms` } as CSSProperties}
      onPointerDown={start} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
      onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && !e.repeat && (e.preventDefault(), start())} onKeyUp={stop}
      onContextMenu={(e) => e.preventDefault()}>
      <span>{holding ? t('holdHint') : label}</span>
    </button>
  )
}

/** Applied changes, kept in the chat with an Undo that reverses exactly those. */
function Receipt({ msg }: { msg: Extract<Msg, { role: 'receipt' }> }) {
  const a = useAssistant()
  const { submit, pending, busy } = useSubmit()
  const { cat } = useLookups()
  const { t } = useI18n()
  const n = msg.changes.length
  const undo = async () => {
    const r = await submit('undo', async (repo) => {
      for (const c of [...msg.changes].reverse()) {
        if (c.op === 'edit') await repo.updateEntry(c.before.id, asNew(c.before))
        else if (c.op === 'delete') await repo.addEntries([asNew(c.before)])
      }
      for (const id of msg.added) await repo.deleteEntry(id)
    }, t('undone'))
    if (r?.ok) a.undone(msg.id)
  }
  return (
    <div className={'receipt' + (msg.undone ? ' undone' : '')}>
      <div className="receipt-h">
        <b>✓ {n === 1 ? t('receipt1') : t('receiptN', { n })}</b>
        {msg.undone ? <span className="pill mute">{t('undone')}</span> : (
          <button className="link" disabled={busy} aria-busy={pending === 'undo'} onClick={undo}><IconUndo className="ico" /> {t('undo')}</button>
        )}
      </div>
      {msg.changes.map((c) => {
        const e = c.op === 'delete' ? c.before : c.after
        const k = e.categoryId ? cat.get(e.categoryId) : undefined
        return (
          <div key={c.key} className="receipt-r">
            <span className={c.op === 'delete' ? 'struck' : ''}>{e.name || e.note || (e.kind === 'transfer' ? t('transfer') : k?.name) || '—'}</span>
            <span className="num">{yen(e.amount)}</span>
          </div>
        )
      })}
    </div>
  )
}
