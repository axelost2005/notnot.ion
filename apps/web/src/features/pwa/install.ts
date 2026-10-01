import { useSyncExternalStore } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}

// El evento puede llegar antes de que se monte React: se guarda acá apenas carga la app.
let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  deferred = event
  notify()
})
window.addEventListener('appinstalled', () => {
  deferred = null
  notify()
})

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** El navegador ofrece instalar (Chrome, Edge, Android). */
export function useInstallPrompt() {
  const event = useSyncExternalStore(
    subscribe,
    () => deferred,
    () => null,
  )
  async function install() {
    if (!event) return
    await event.prompt()
    deferred = null
    notify()
  }
  return { canInstall: event !== null, install }
}

/** Safari en iPhone/iPad no tiene botón de instalar: se agrega desde "Compartir". */
export function needsIosInstallTip() {
  const ios =
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && navigator.standalone === true)
  return ios && !standalone
}
