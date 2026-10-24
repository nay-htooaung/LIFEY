import { describe, expect, it } from 'vitest'
import { clip, decodeText, fileText } from './file'

describe('assistant files', () => {
  it('reads UTF-8 and Shift_JIS statements', () => {
    expect(decodeText(new TextEncoder().encode('﻿日付,金額\r\n2026/10/01,1200\r\n'))).toBe('日付,金額\n2026/10/01,1200\n')
    // 日付 in Shift_JIS
    expect(decodeText(new Uint8Array([0x93, 0xfa, 0x95, 0x74]))).toBe('日付')
  })
  it('cuts a long file at a line end and says so', () => {
    expect(clip('a,1\nb,2\nc,3', 9)).toEqual({ text: 'a,1\nb,2', cut: true })
    expect(clip('a,1', 9)).toEqual({ text: 'a,1', cut: false })
    expect(fileText({ name: 'card.csv', text: 'a,1', cut: true })).toBe('[File: card.csv]\na,1\n[The rest of the file was too long and was left out.]')
  })
})
