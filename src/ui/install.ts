import { useSyncExternalStore } from 'react'

/** Chrome's install event (Android, desktop). Not in the DOM typings yet. */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

const standalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true)

// Registered at import time: the event can fire before React mounts.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as InstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    installed = true
    emit()
  })
}

/**
 * 'prompt': the browser can install with one tap.
 * 'ios': Safari has no prompt; the person uses Share → Add to Home Screen.
 * 'none': already installed, or this browser cannot install.
 */
export type InstallState = 'prompt' | 'ios' | 'none'

function current(): InstallState {
  if (installed || standalone()) return 'none'
  if (deferred) return 'prompt'
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  return ios ? 'ios' : 'none'
}

export function useInstall(): InstallState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    current,
    () => 'none',
  )
}

/** Shows the browser's install dialog. Resolves true when the person accepts. */
export async function promptInstall(): Promise<boolean> {
  const e = deferred
  if (!e) return false
  deferred = null
  emit()
  await e.prompt()
  const { outcome } = await e.userChoice
  return outcome === 'accepted'
}
