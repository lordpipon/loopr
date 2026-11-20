self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    if (typeof payload.title !== "string" || typeof payload.body !== "string") return;
    event.waitUntil(self.registration.showNotification(payload.title, {
      body: payload.body, icon: "/logo.svg", tag: "loopr-push",
    }));
  } catch {
    // Ignore malformed messages.
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = new URL("/home", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((window) => window.url === destination);
    return existing ? existing.focus() : self.clients.openWindow(destination);
  }));
});
