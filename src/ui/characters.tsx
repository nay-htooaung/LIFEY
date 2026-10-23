/**
 * Profile characters: flat faces on a coloured tile, drawn as SVG so they look the same everywhere
 * (no emoji fonts). Colours are the --char-* tokens in styles/themes.css. The id is what profiles.avatar stores.
 */
export const CHARACTERS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12', 'c13', 'c14'] as const
export type CharacterId = (typeof CHARACTERS)[number]

export const isCharacter = (x: string | null | undefined): x is CharacterId => !!x && (CHARACTERS as readonly string[]).includes(x)

const ink = 'var(--char-ink)'
const line = { fill: 'none', stroke: ink, strokeWidth: 3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

const eyes = {
  dots: <><circle cx="17" cy="21" r="3" fill={ink} /><circle cx="31" cy="21" r="3" fill={ink} /></>,
  big: <><circle cx="17" cy="21" r="4.5" fill={ink} /><circle cx="31" cy="21" r="4.5" fill={ink} /><circle cx="18.4" cy="19.6" r="1.4" fill="var(--char-shine)" /><circle cx="32.4" cy="19.6" r="1.4" fill="var(--char-shine)" /></>,
  happy: <><path d="M13 22q4-5 8 0" {...line} /><path d="M27 22q4-5 8 0" {...line} /></>,
  sleepy: <><path d="M13 21q4 4 8 0" {...line} /><path d="M27 21q4 4 8 0" {...line} /></>,
  wink: <><circle cx="17" cy="21" r="3" fill={ink} /><path d="M27 21h8" {...line} /></>,
  shades: <><rect x="10" y="17" width="12" height="7" rx="3" fill={ink} /><rect x="26" y="17" width="12" height="7" rx="3" fill={ink} /><path d="M22 19.5h4" {...line} strokeWidth={2} /></>,
}
const mouths = {
  smile: <path d="M17 30q7 7 14 0" {...line} />,
  grin: <path d="M16 29h16q-1 9-8 9t-8-9z" fill={ink} />,
  o: <circle cx="24" cy="32" r="3.5" fill={ink} />,
  small: <path d="M21 32q3 2.5 6 0" {...line} />,
  flat: <path d="M19 32h10" {...line} />,
  tongue: <><path d="M17 29q7 7 14 0" {...line} /><path d="M24 32.5v3.5" {...line} stroke="var(--char-cheek)" strokeWidth={4} /></>,
}
const cheeks = <><circle cx="11.5" cy="28" r="3" fill="var(--char-cheek)" /><circle cx="36.5" cy="28" r="3" fill="var(--char-cheek)" /></>

type Face = [bg: number, eye: keyof typeof eyes, mouth: keyof typeof mouths, blush?: boolean]
const FACES: Record<CharacterId, Face> = {
  c1: [1, 'dots', 'smile', true],
  c2: [2, 'happy', 'grin'],
  c3: [3, 'big', 'o'],
  c4: [4, 'wink', 'tongue'],
  c5: [5, 'shades', 'small'],
  c6: [6, 'sleepy', 'small', true],
  c7: [7, 'big', 'smile'],
  c8: [8, 'dots', 'flat'],
  c9: [1, 'happy', 'smile', true],
  c10: [3, 'shades', 'grin'],
  c11: [5, 'big', 'tongue', true],
  c12: [7, 'sleepy', 'o'],
  c13: [2, 'dots', 'tongue'],
  c14: [8, 'big', 'grin', true],
}

export function Character({ id }: { id: CharacterId }) {
  const [bg, eye, mouth, blush] = FACES[id]
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="char-svg">
      <rect width="48" height="48" fill={`var(--char-${bg})`} />
      {blush && cheeks}
      {eyes[eye]}
      {mouths[mouth]}
    </svg>
  )
}
