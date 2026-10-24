/** A file read in the app, ready to send: its text, or (a scanned PDF) its first pages as photos. */
export interface ReadFile { name: string; text?: string; pages?: string[]; cut?: boolean }

/** Enough for a few months of a bank or card statement; the rest is cut and the assistant is told. */
export const MAX_FILE_CHARS = 40_000
/** Pages of a scanned PDF sent as photos; each is about as big as one photo. */
const MAX_PAGES = 2
const TEXT = /\.(csv|tsv|txt|text|json|md|ofx|qfx|qif|tab)$/i

/** What the file picker offers: statements as text or PDF, and photos. */
export const FILE_ACCEPT = '.csv,.tsv,.txt,.json,.md,.ofx,.qfx,.qif,.pdf,text/*,application/pdf,image/*'

export class FileError extends Error {
  constructor(readonly code: 'unsupported' | 'empty' | 'unreadable') {
    super(code)
  }
}

export const isPhotoFile = (f: File) => f.type.startsWith('image/')
const isPdf = (f: File) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name)
const isText = (f: File) => f.type.startsWith('text/') || f.type === 'application/json' || TEXT.test(f.name)

/** Text in UTF-8, or Shift_JIS, which Japanese banks and card companies still use for CSV. */
export function decodeText(bytes: Uint8Array): string {
  let s: string
  try {
    s = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    s = new TextDecoder('shift_jis').decode(bytes)
  }
  return s.replace(/^﻿/, '').replace(/\r\n?/g, '\n')
}

/** At most `max` characters, cut at a line end so no row is left half. */
export function clip(text: string, max = MAX_FILE_CHARS): { text: string; cut: boolean } {
  if (text.length <= max) return { text, cut: false }
  const end = text.lastIndexOf('\n', max)
  return { text: text.slice(0, end > 0 ? end : max), cut: true }
}

/** The words the assistant gets for a file it can read as text. */
export function fileText(f: ReadFile): string {
  return `[File: ${f.name}]\n${f.text ?? ''}${f.cut ? '\n[The rest of the file was too long and was left out.]' : ''}`
}

export async function readFile(file: File): Promise<ReadFile> {
  const name = file.name.slice(0, 80) || 'file'
  if (isPdf(file)) return readPdf(file, name)
  if (!isText(file)) throw new FileError('unsupported')
  const text = decodeText(new Uint8Array(await file.arrayBuffer())).trim()
  if (!text) throw new FileError('empty')
  return { name, ...clip(text) }
}

/** A PDF's words; a scan has none, so its first pages go as photos instead. pdf.js loads only when needed. */
async function readPdf(file: File, name: string): Promise<ReadFile> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  // Japanese PDFs need the character maps to give their words back
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), cMapUrl: new URL('pdfjs/cmaps/', document.baseURI).href, cMapPacked: true })
  let doc
  try {
    doc = await task.promise
  } catch {
    throw new FileError('unreadable')
  }
  try {
    const pages: string[] = []
    let length = 0
    for (let i = 1; i <= doc.numPages && length <= MAX_FILE_CHARS; i++) {
      const content = await (await doc.getPage(i)).getTextContent()
      const lines = content.items.map((it) => ('str' in it ? it.str + (it.hasEOL ? '\n' : ' ') : '')).join('')
      const page = lines.replace(/[ \t]+\n/g, '\n').replace(/[ \t]{2,}/g, ' ').trim()
      pages.push(page)
      length += page.length
    }
    const text = pages.filter(Boolean).join('\n\n')
    if (text.length > 20) return { name, ...clip(text) }
    const photos: string[] = []
    for (let i = 1; i <= Math.min(doc.numPages, MAX_PAGES); i++) {
      const page = await doc.getPage(i)
      const view = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: 1600 / Math.max(view.width, view.height) })
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(viewport.width)
      canvas.height = Math.round(viewport.height)
      await page.render({ canvas, viewport }).promise
      photos.push(canvas.toDataURL('image/jpeg', 0.82))
    }
    if (!photos.length) throw new FileError('empty')
    return { name, pages: photos, cut: doc.numPages > MAX_PAGES }
  } finally {
    void task.destroy()
  }
}
