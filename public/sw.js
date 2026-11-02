// 오프라인에서도 열리도록 앱 파일을 캐시한다. 사용자 사진·작업은 건드리지 않는다(외부 요청도 캐시하지 않음).
const CACHE = "card-news-shell-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(["/", "/favicon.svg", "/manifest.webmanifest"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("card-news-shell-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/legal/")) return;

  // 화면(HTML): 네트워크 우선, 오프라인이면 캐시
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put("/", copy)); return res; }).catch(() => caches.match("/")));
    return;
  }
  // 해시가 붙은 정적 파일(/assets/…): 캐시 우선
  event.respondWith(
    caches.match(request).then((hit) => hit || fetch(request).then((res) => {
      if (res.ok && url.pathname.startsWith("/assets/")) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); }
      return res;
    })),
  );
});
