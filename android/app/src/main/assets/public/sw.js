/* 한박자 오프라인 캐시. 빌드 때 생성됩니다. */
const CACHE = "hanbakja-2026-10-21T06-28-49-419Z";
const PRECACHE = [
  "/",
  "/404.html",
  "/404/",
  "/404/index.html",
  "/__next.__PAGE__.txt",
  "/__next._full.txt",
  "/__next._tree.txt",
  "/_next/static/binog5C0LHvCrS60X7e55/_buildManifest.js",
  "/_next/static/binog5C0LHvCrS60X7e55/_clientMiddlewareManifest.js",
  "/_next/static/binog5C0LHvCrS60X7e55/_ssgManifest.js",
  "/_next/static/chunks/02ze5p2xx5st1.js",
  "/_next/static/chunks/0bma92pht_c97.js",
  "/_next/static/chunks/0cz1d0mv5g_q7.js",
  "/_next/static/chunks/0ek5syp_dy1j9.css",
  "/_next/static/chunks/0jfq90cpgzi8i.js",
  "/_next/static/chunks/1xmi2ogzfsfv6.js",
  "/_next/static/chunks/2as3_2t2fiuhg.js",
  "/_next/static/chunks/2cdfhrbatlgax.js",
  "/_next/static/chunks/2i51e627rllld.js",
  "/_next/static/chunks/2p-9vwdchi984.js",
  "/_next/static/chunks/2q42p592480bv.js",
  "/_next/static/chunks/2quh522clsa3r.js",
  "/_next/static/chunks/2r_takk2jjl9g.js",
  "/_next/static/chunks/2w4q7arzqy14n.js",
  "/_next/static/chunks/2y8thsq80nj8a.js",
  "/_next/static/chunks/33ljlvs6u06pq.js",
  "/_next/static/chunks/3fntmmi971322.js",
  "/_next/static/chunks/3mc6dra1m0098.js",
  "/_next/static/chunks/3vtzbjdlqlout.js",
  "/_next/static/chunks/3wa0iiajwm9lr.js",
  "/_next/static/chunks/42ru0snkltfss.js",
  "/_next/static/chunks/turbopack-1ixxz32rqu211.js",
  "/_next/static/media/icon.26gbj39tg4mav.png",
  "/_next/static/media/noto-sans-kr-korean-400-normal.16dwwuc9e4oj4.woff2",
  "/_next/static/media/noto-sans-kr-korean-400-normal.2lmzhxe8gv8gt.woff",
  "/_next/static/media/noto-sans-kr-korean-500-normal.1eu5qghblois-.woff",
  "/_next/static/media/noto-sans-kr-korean-500-normal.3w_tj97pakwwt.woff2",
  "/_next/static/media/noto-sans-kr-korean-700-normal.3fm7ua2fmwd9b.woff2",
  "/_next/static/media/noto-sans-kr-korean-700-normal.3n96cz-a8osul.woff",
  "/_next/static/media/noto-sans-kr-latin-400-normal.1dsbr-1xhhy5e.woff",
  "/_next/static/media/noto-sans-kr-latin-400-normal.431-ew7r0z0bu.woff2",
  "/_next/static/media/noto-sans-kr-latin-500-normal.25ewc266m8i20.woff",
  "/_next/static/media/noto-sans-kr-latin-500-normal.2qw05zqt0yxq4.woff2",
  "/_next/static/media/noto-sans-kr-latin-700-normal.0k-mwa-2mdzo8.woff2",
  "/_next/static/media/noto-sans-kr-latin-700-normal.15i5u7na5o2g_.woff",
  "/_not-found/",
  "/_not-found/__next._full.txt",
  "/_not-found/__next._not-found.__PAGE__.txt",
  "/_not-found/__next._tree.txt",
  "/_not-found/index.html",
  "/_not-found/index.txt",
  "/icon.png",
  "/icons/apple-touch-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/index.html",
  "/index.txt",
  "/manifest.webmanifest",
  "/report/",
  "/report/__next._full.txt",
  "/report/__next._tree.txt",
  "/report/__next.report.__PAGE__.txt",
  "/report/index.html",
  "/report/index.txt",
  "/settings/",
  "/settings/__next._full.txt",
  "/settings/__next._tree.txt",
  "/settings/__next.settings.__PAGE__.txt",
  "/settings/index.html",
  "/settings/index.txt",
  "/stats/",
  "/stats/__next._full.txt",
  "/stats/__next._tree.txt",
  "/stats/__next.stats.__PAGE__.txt",
  "/stats/index.html",
  "/stats/index.txt",
  "/watch/",
  "/watch/__next._full.txt",
  "/watch/__next._tree.txt",
  "/watch/__next.watch.__PAGE__.txt",
  "/watch/index.html",
  "/watch/index.txt"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith(".apk")) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      try {
        const fresh = await fetch(request);
        if (fresh.ok) await cache.put(request, fresh.clone());
        return fresh;
      } catch {
        if (cached) return cached;
        const pathName = url.pathname.endsWith("/") ? url.pathname : url.pathname + "/";
        return (
          (await cache.match(pathName)) ||
          (await cache.match(pathName + "index.html")) ||
          (await cache.match("/")) ||
          new Response("오프라인 상태이고 이 화면은 아직 저장되지 않았습니다.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          })
        );
      }
    })(),
  );
});
