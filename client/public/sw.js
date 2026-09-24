const CACHE_PREFIX = "sansuu-asobi-";
const CACHE_VERSION = "__PWA_BUILD_VERSION__";
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;

// `pnpm build` の最後に、実際のハッシュ付きJS/CSSとゲーム画像へ置き換わります。
const PRECACHE_URLS = ["__PWA_PRECACHE_MANIFEST__"];

const scopedUrl = (path) => new URL(path, self.registration.scope).href;

async function cacheUrl(cache, url) {
  const absoluteUrl = scopedUrl(url);
  const cacheRequest = new Request(absoluteUrl, { credentials: "same-origin" });
  const cachedResponse = await cache.match(cacheRequest, { ignoreSearch: true, ignoreVary: true });
  if (cachedResponse) return cachedResponse;

  const response = await fetch(cacheRequest);
  if (!response.ok) throw new Error(`Could not cache ${absoluteUrl}: ${response.status}`);
  await cache.put(cacheRequest, response.clone());
  return response;
}

async function cacheUrls(cache, urls) {
  const uniqueUrls = [...new Set(urls)];
  const batchSize = 3;
  for (let index = 0; index < uniqueUrls.length; index += batchSize) {
    await Promise.all(uniqueUrls.slice(index, index + batchSize).map((url) => cacheUrl(cache, url)));
  }
}

async function missingPrecacheUrls(cache) {
  const checks = await Promise.all(
    PRECACHE_URLS.map(async (url) => ({
      url,
      response: await cache.match(scopedUrl(url), { ignoreSearch: true, ignoreVary: true }),
    })),
  );
  return checks.filter(({ response }) => !response).map(({ url }) => url);
}

function replyToClient(event, message) {
  if (event.source && "postMessage" in event.source) event.source.postMessage(message);
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cacheUrls(cache, PRECACHE_URLS);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX) && cacheName !== CACHE_NAME)
        .map((cacheName) => caches.delete(cacheName)),
    );
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (!event.data || !["CACHE_URLS", "CHECK_OFFLINE_READY"].includes(event.data.type)) return;

  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      const extraUrls = Array.isArray(event.data.urls) ? event.data.urls : [];
      await cacheUrls(cache, [...PRECACHE_URLS, ...extraUrls]);
      const missingUrls = await missingPrecacheUrls(cache);
      if (missingUrls.length) throw new Error(`Offline cache is missing ${missingUrls.length} files`);
      replyToClient(event, {
        type: "OFFLINE_READY",
        cachedAssets: PRECACHE_URLS.length + extraUrls.length,
        cacheName: CACHE_NAME,
      });
    } catch (error) {
      replyToClient(event, {
        type: "OFFLINE_ERROR",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  })());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedPage = (await cache.match(scopedUrl("/index.html"), { ignoreSearch: true, ignoreVary: true }))
        ?? (await cache.match(scopedUrl("/"), { ignoreSearch: true, ignoreVary: true }));
      if (cachedPage) return cachedPage;

      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(scopedUrl("/index.html"), response.clone());
        return response;
      } catch {
        return new Response("オフラインの じゅんびが できていません。オンラインで もういちど ひらいてね。", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request, { ignoreSearch: true, ignoreVary: true });
    if (cachedResponse) return cachedResponse;

    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  })());
});
