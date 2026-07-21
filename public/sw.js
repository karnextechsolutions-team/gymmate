// Service Worker for Web Push Notifications

self.addEventListener("push", function (event) {
  if (!event.data) return;

  let payload = {
    title: "GymMate Notification",
    body: "You have a new update in GymMate!",
    icon: "/icon-192.png",
    data: { url: "/notifications" },
  };

  try {
    payload = event.data.json();
  } catch (e) {
    payload.body = event.data.text();
  }

  const options = {
    body: payload.body || "New update from your gym trainer!",
    icon: payload.icon || "/icon-192.png",
    badge: "/badge.png",
    vibrate: [100, 50, 100],
    data: payload.data || { url: "/notifications" },
    actions: [
      { action: "open", title: "View Notification" }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || "GymMate Alert", options)
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : "/notifications";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
