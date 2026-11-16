// Network first for the app itself so updates arrive whenever the phone is online; the cache keeps it opening offline.
importScripts("backend.js");
const CACHE = "comic-tracker-shell";
const SHELL = ["./", "index.html", "backend.js", "phone-ui.js", "reader.js", "story.js", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return; // relay and Wikipedia go straight out
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === "navigate" ? caches.match("index.html") : Response.error())))
  );
});

// Android Chrome wakes the installed app now and then to look for new chapters.
self.addEventListener("periodicsync", (e) => {
  if (e.tag === "ct-check") e.waitUntil(CT.runCheck().catch(() => {}));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(self.clients.matchAll({ type: "window" }).then((list) => {
    if (list[0]) { list[0].postMessage({ tab: "updates" }); return list[0].focus(); }
    return self.clients.openWindow(url);
  }));
});
