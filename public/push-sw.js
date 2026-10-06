// Push handlers, loaded into the generated service worker via workbox.importScripts (see vite.config.ts).
// Payload shape is built by api/_lib/pushPayload.ts: { title, body, url, tag }.

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'RemindU', {
      body: data.body,
      tag: data.tag,
      icon: '/icon-192.png',
      data: { url: data.url ?? '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windows) => {
      const open = windows[0]
      if (!open) return self.clients.openWindow(url)
      // The app listens for this (src/lib/route.ts) and navigates without a reload.
      open.postMessage({ type: 'navigate', url })
      return open.focus()
    }),
  )
})
