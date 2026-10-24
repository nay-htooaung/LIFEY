import type { SVGProps } from 'react'

const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
type P = SVGProps<SVGSVGElement>

export const IconToday = (p: P) => (<svg {...base} {...p}><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></svg>)
export const IconList = (p: P) => (<svg {...base} {...p}><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></svg>)
export const IconPlus = (p: P) => (<svg {...base} strokeWidth={2.4} {...p}><path d="M12 5v14M5 12h14" /></svg>)
export const IconWallet = (p: P) => (<svg {...base} {...p}><path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1V7zM4 7l11-3v3" /><circle cx="16" cy="13.5" r="1.2" fill="currentColor" /></svg>)
export const IconPlan = (p: P) => (<svg {...base} {...p}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r=".6" fill="currentColor" /></svg>)
export const IconFlame = (p: P) => (<svg viewBox="0 0 24 24" width={22} height={22} fill="currentColor" {...p}><path d="M12 2s5 4.5 5 10a5 5 0 0 1-10 0c0-2.2 1-3.8 2-5 .3 1.6 1.2 2.6 2 3 0-3 1-6 1-8z" /></svg>)
export const IconRepeat = (p: P) => (<svg className="ico" {...base} strokeWidth={2.2} {...p}><path d="M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4" /></svg>)
export const IconLock = (p: P) => (<svg className="ico" {...base} strokeWidth={2.2} {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>)
export const IconChevron = (p: P) => (<svg width={16} height={16} {...base} strokeWidth={2.4} {...p}><path d="M6 9l6 6 6-6" /></svg>)
export const IconEdit = (p: P) => (<svg width={18} height={18} {...base} {...p}><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" /></svg>)
export const IconSpark = (p: P) => (<svg {...base} {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z" /></svg>)
export const IconSend = (p: P) => (<svg {...base} strokeWidth={2.4} {...p}><path d="M12 19V5M5 12l7-7 7 7" /></svg>)
export const IconStop = (p: P) => (<svg {...base} {...p}><rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" /></svg>)
export const IconX = (p: P) => (<svg {...base} strokeWidth={2.4} {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>)
export const IconUndo = (p: P) => (<svg {...base} {...p}><path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" /></svg>)
export const IconCamera = (p: P) => (<svg {...base} {...p}><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.5" /></svg>)
export const IconClip = (p: P) => (<svg {...base} {...p}><path d="M20 11.5l-7.8 7.8a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8" /></svg>)
export const IconFile = (p: P) => (<svg {...base} {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></svg>)
export const IconImage = (p: P) => (<svg {...base} {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.8" /><path d="M21 16l-5-5-9 9" /></svg>)
