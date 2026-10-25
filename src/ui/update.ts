import { useSyncExternalStore } from 'react'
import { registerSW } from 'virtual:pwa-register'

// A new version is looked for every 30 minutes and whenever the app comes back to the screen. Once it is
// downloaded, UpdateNotice shows that it is updating and switches to it (a reload), but not while a sheet is open.
const CHECK_MS = 30 * 60_000

let ready = false
const listeners = new Set<() => void>()

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // nobody is looking: switch at once
    if (document.visibilityState === 'hidden') return void updateSW(true)
    ready = true
    listeners.forEach((l) => l())
  },
  onRegisteredSW(_url, reg) {
    if (!reg) return
    const check = () => void reg.update().catch(() => {})
    setInterval(check, CHECK_MS)
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check())
  },
})

/** Switches to the downloaded version (the page reloads). */
export const applyUpdate = () => void updateSW(true)

/** Whether a new version is downloaded and waiting. */
export const useUpdateReady = () =>
  useSyncExternalStore((l) => (listeners.add(l), () => void listeners.delete(l)), () => ready)
