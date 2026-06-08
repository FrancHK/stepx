self.addEventListener('push', function (event) {
  const data = event.data ? event.data.json() : {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'StepX', {
      body: data.body || 'Order mpya imepokelewa!',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: { url: data.url || '/admin/orders' },
      vibrate: [200, 100, 200],
      requireInteraction: true,
    })
  )
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (const client of list) {
        if (client.url.includes('/admin') && 'focus' in client) return client.focus()
      }
      return clients.openWindow(event.notification.data?.url || '/admin/orders')
    })
  )
})
