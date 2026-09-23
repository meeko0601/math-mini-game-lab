const CACHE_NAME = "sansuu-asobi-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/pwa-192.png",
  "./assets/icons/pwa-512.png",
  "./assets/icons/pwa-maskable-512.png",
];

const scopedUrl = (path) => new URL(path, self.registration.scope).href;

async function cacheUrl(cache, url, reload = false) {
  const absoluteUrl = scopedUrl(url);
  const request = new Request(absoluteUrl, { cache: reload ? "reload" : "default" });
  if (!reload) {
    const cachedResponse = await cache.match(request, { ignoreSearch: true });
    if (cachedResponse) return cachedResponse;
  }
  const response = await fetch(request);
  if (!response.ok) throw new Error(`Could not cache ${absoluteUrl}: ${response.status}`);
  await cache.put(request, response.clone());
  return response;
}

async function cacheUrls(cache, urls, reload = false) {
  const uniqueUrls = [...new Set(urls)];
  const batchSize = 4;
  for (let index = 0; index < uniqueUrls.length; index += batchSize) {
    await Promise.all(
      uniqueUrls.slice(index, index + batchSize).map((url) => cacheUrl(cache, url, reload)),
    );
  }
}

async function cacheDocumentAssets(cache) {
  const pageResponse = await cacheUrl(cache, "./", true);
  const html = await pageResponse.text();
  const linkedAssets = [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["']/gi)]
    .map((match) => match[1])
    .filter((url) => !url.startsWith("data:"));
  await cacheUrls(cache, linkedAssets, true);
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cacheUrls(cache, APP_SHELL, true);
    await cacheDocumentAssets(cache);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((cacheName) => cacheName.startsWith("sansuu-asobi-") && cacheName !== CACHE_NAME)
        .map((cacheName) => caches.delete(cacheName)),
    );
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_URLS" || !Array.isArray(event.data.urls)) return;

  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cacheUrls(cache, event.data.urls);
      event.source?.postMessage({
        type: "OFFLINE_READY",
        cachedAssets: event.data.urls.length,
      });
    } catch (error) {
      event.source?.postMessage({
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
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        return (await caches.match(request, { ignoreSearch: true }))
          ?? (await caches.match(scopedUrl("./")))
          ?? (await caches.match(scopedUrl("./index.html")));
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cachedResponse = await caches.match(request, { ignoreSearch: true });
    if (cachedResponse) return cachedResponse;

    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
