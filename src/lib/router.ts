import { useEffect, useSyncExternalStore } from 'react'
import { parseRoute, type Route } from '@/lib/routes'

// A tiny History API router: four tabs plus /reminders/:id, so no router library is needed.
const NAVIGATE_EVENT = 'remindu:navigate'

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange)
  window.addEventListener(NAVIGATE_EVENT, onChange)
  return () => {
    window.removeEventListener('popstate', onChange)
    window.removeEventListener(NAVIGATE_EVENT, onChange)
  }
}

export function navigate(path: string, { replace = false } = {}) {
  if (path === window.location.pathname) return
  window.history[replace ? 'replaceState' : 'pushState'](null, '', path)
  window.dispatchEvent(new Event(NAVIGATE_EVENT))
}

/** The current route; re-renders on navigate() and on the browser back/forward buttons. */
export function useRoute(): Route {
  const pathname = useSyncExternalStore(subscribe, () => window.location.pathname)
  return parseRoute(pathname)
}

/** The service worker asks an already-open app to go to a tapped notification's url (public/push-sw.js). */
export function useNotificationNavigation() {
  useEffect(() => {
    const sw = navigator.serviceWorker
    if (!sw) return
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'navigate' && typeof e.data.url === 'string' && e.data.url.startsWith('/')) navigate(e.data.url)
    }
    sw.addEventListener('message', onMessage)
    return () => sw.removeEventListener('message', onMessage)
  }, [])
}
