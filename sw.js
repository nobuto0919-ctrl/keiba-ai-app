const CACHE = "keiba-ai-v3";
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(["./", "index.html", "manifest.json", "icon-192.png"]))); });
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; })
    .catch(() => caches.match(e.request)));   // 電波が無いときだけ前に見た内容を出す
});
// 2026-11-24 アプリのプッシュ通知（PC の odds_schedule.send_push が送る）。押すとそのレースの画面を開く
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data.json(); } catch (_) { d = {body: e.data ? e.data.text() : ""}; }
  const jobs = [self.registration.showNotification(d.title || "AI競馬予想", {body: d.body || "", icon: "icon-192.png", badge: "icon-192.png", data: {url: d.url || "./"}})];
  // 2026-11-28 10分前に決まった買い目を覚えて、開いているアプリにも知らせる（アプリの「ネット投票へ」で使う）
  if (d.final && d.final.id) {
    jobs.push(caches.open("keiba-final").then(c => c.put("./final/" + d.final.id, new Response(JSON.stringify(d.final), {headers: {"Content-Type": "application/json"}}))));
    jobs.push(clients.matchAll({type: "window", includeUncontrolled: true}).then(ws => ws.forEach(w => w.postMessage({final: d.final}))));
  }
  e.waitUntil(Promise.all(jobs));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = (e.notification.data || {}).url || "./";
  // 2026-11-24: 開いているアプリには画面の移動を頼み（iPhone は navigate が効かないことがあるため）、無ければそのレースの画面で開く
  e.waitUntil(clients.matchAll({type: "window", includeUncontrolled: true}).then(ws => {
    for (const w of ws) { w.postMessage({nav: url}); if ("focus" in w) return w.focus(); }
    return clients.openWindow(url);
  }));
});
