import { describe, expect, it } from 'vitest'
import { plainText } from './index'

describe('message content', () => {
  it('sends a file\'s text as one string', () => {
    expect(plainText([{ type: 'text', text: 'Log these.' }, { type: 'text', text: '[File: a.csv]\n1,2' }])).toBe('Log these.\n\n[File: a.csv]\n1,2')
  })
  it('keeps parts when there is a photo', () => {
    const parts = [{ type: 'text' as const, text: 'Log this.' }, { type: 'image_url' as const, image_url: { url: 'data:image/jpeg;base64,AA' } }]
    expect(plainText(parts)).toBe(parts)
    expect(plainText('hi')).toBe('hi')
  })
})
