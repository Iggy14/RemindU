// Push handlers, loaded into the generated service worker via workbox.importScripts (see vite.config.ts).
// Payload shape is built by api/_lib/pushPayload.ts: { title, body, url, tag }.

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'RemindU', {
      body: data.body,
      tag: data.tag,
      icon: '/favicon.svg',
      data: { url: data.url ?? '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows[0]
      if (open) return open.focus()
      return self.clients.openWindow(url)
    }),
  )
})
