import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { changeImpact, type Change } from '../domain/changes'
import { asNew } from '../domain/recurring'
import type { Entry, NewEntry } from '../domain/types'
import { useI18n, yen } from '../i18n'
import { toneVar, useLookups, useStore, useSubmit } from '../data/store'
import { EntrySheet } from '../sheets/EntrySheet'
import { Glyph } from '../ui/bits'
import { usePaidWith } from '../ui/entry'
import { IconChevron, IconSend, IconSpark, IconUndo, IconX } from '../ui/icons'
import { useUI } from '../ui/ui'
import { mockTurn, suggestions, type Intent, type Msg, type Step, type Waiting } from './mock'

/** A proposed change in the tray; `skip` leaves it out when applying. */
type Pending = Change & { skip?: boolean }

interface Assistant {
  msgs: Msg[]
  tray: Pending[]
  thinking: boolean
  send(text: string, opts?: { intent?: Intent; choice?: string; askId?: number }): void
  setTray(fn: (tray: Pending[]) => Pending[]): void
  /** Moves the applied changes from the tray into a receipt in the chat. */
  applied(changes: Change[], added: string[]): void
  undone(receiptId: number): void
  reset(): void
}

const Ctx = createContext<Assistant | null>(null)
const useAssistant = () => {
  const a = useContext(Ctx)
  if (!a) throw new Error('useAssistant outside AssistantProvider')
  return a
}

let nextId = 1
const STEP_MS = 650

/** Keeps the conversation while the sheet is closed. */
export function AssistantProvider({ children }: { children: ReactNode }) {
  const { snap, space, personal, today } = useStore()
  const { t } = useI18n()
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [tray, setTray] = useState<Pending[]>([])
  const [thinking, setThinking] = useState(false)
  const waiting = useRef<Waiting>(null)
  const ctx = useRef({ snap, space, personal, today, t })
  ctx.current = { snap, space, personal, today, t }
  // a new chat drops replies still on their way
  const turn = useRef(0)

  const play = useCallback(async (steps: Step[], n: number) => {
    setThinking(true)
    for (const step of steps) {
      await new Promise((r) => setTimeout(r, STEP_MS))
      if (turn.current !== n) return
      if ('propose' in step) setTray((tr) => [...tr, ...step.propose])
      else setMsgs((m) => [...m, { ...step.msg, id: nextId++ } as Msg])
    }
    setThinking(false)
  }, [])

  const value = useMemo<Assistant>(() => ({
    msgs, tray, thinking, setTray,
    send(text, { intent, choice, askId } = {}) {
      const trimmed = text.trim()
      if (!trimmed || thinking) return
      setMsgs((m) => [
        ...m.map((x) => (x.id === askId && x.role === 'ask' ? { ...x, answer: choice } : x)),
        { id: nextId++, role: 'user', text: trimmed },
      ])
      // typing a suggestion out counts as tapping it
      const known = intent ?? suggestions(ctx.current).find((s) => s.text === trimmed)?.intent
      const r = mockTurn({ text: trimmed, choice, intent: known }, waiting.current, ctx.current)
      waiting.current = r.waiting
      void play(r.steps, turn.current)
    },
    applied(changes, added) {
      setTray([])
      setMsgs((m) => [...m, { id: nextId++, role: 'receipt', changes, added }])
    },
    undone(id) {
      setMsgs((m) => m.map((x) => (x.id === id && x.role === 'receipt' ? { ...x, undone: true } : x)))
    },
    reset() {
      turn.current++
      waiting.current = null
      setMsgs([])
      setTray([])
      setThinking(false)
    },
  }), [msgs, tray, thinking, play])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function AssistantSheet() {
  const a = useAssistant()
  const store = useStore()
  const { t } = useI18n()
  const [text, setText] = useState('')
  const end = useRef<HTMLDivElement>(null)
  const sugs = suggestions({ ...store, t })
  const lastAsk = [...a.msgs].reverse().find((m) => m.role === 'ask')

  // the newest message stays in view; the footer is last in the sheet, so scrolling to the end shows both
  useEffect(() => {
    const body = end.current?.closest('.sheet-body')
    body?.scrollTo({ top: body.scrollHeight, behavior: 'smooth' })
  }, [a.msgs.length, a.thinking, a.tray.length])

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
        <span className="pill mute">{t('preview')}</span>
        {a.msgs.length > 0 && <button className="link" onClick={a.reset}>{t('newChat')}</button>}
      </div>

      <div className="chat-log">
        <AiBubble>{t('aiHello')}</AiBubble>
        <p className="chat-note">{t('aiPreviewNote')}</p>
        {a.msgs.map((m) =>
          m.role === 'user' ? <div key={m.id} className="bub me">{m.text}</div>
          : m.role === 'ai' ? <AiBubble key={m.id}>{m.text}</AiBubble>
          : m.role === 'tool' ? <div key={m.id} className="chat-tool">✓ {m.text}</div>
          : m.role === 'ask' ? (
            <div key={m.id} className="ask">
              <AiBubble>{m.text}</AiBubble>
              <div className="chips wrap" role="group" aria-label={m.text}>
                {m.options.map((o) => (
                  <button key={o.value} className="chip" aria-pressed={m.answer === o.value}
                    disabled={!!m.answer || m !== lastAsk || a.thinking}
                    onClick={() => a.send(o.label, { choice: o.value, askId: m.id })}>{o.label}</button>
                ))}
              </div>
            </div>
          )
          : <Receipt key={m.id} msg={m} />,
        )}
        {a.thinking && <div className="typing" role="status" aria-label={t('thinking')}><i /><i /><i /></div>}
        {a.msgs.length === 0 && (
          <div className="sugs">
            <div className="label">{t('tryThese')}</div>
            {sugs.map((s) => (
              <button key={s.text} className="sug" onClick={() => a.send(s.text, { intent: s.intent })}>{s.text}</button>
            ))}
          </div>
        )}
        <div ref={end} />
      </div>

      <div className="chat-foot">
        {a.tray.length > 0 && <Tray />}
        <form className="composer" onSubmit={submit}>
          <input className="input" value={text} maxLength={300} placeholder={t('askPh')} aria-label={t('askPh')}
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
    if (r?.ok) a.applied(live.map(({ skip: _s, ...c }) => c as Change), r.value)
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
          <button className="btn" disabled={busy} onClick={() => a.setTray(() => [])}>{t('discard')}</button>
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
