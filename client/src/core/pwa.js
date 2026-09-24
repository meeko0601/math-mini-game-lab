export function registerPwa({ assetUrls = [], onReady, onError } = {}) {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

  let lastWorker = null;

  const handleMessage = (event) => {
    if (event.data?.type === "OFFLINE_READY") onReady?.(event.data);
    if (event.data?.type === "OFFLINE_ERROR") {
      onError?.(new Error(event.data.message ?? "Offline cache failed"));
    }
  };
  navigator.serviceWorker.addEventListener("message", handleMessage);

  const prepareOfflineCache = (worker) => {
    if (!worker || worker === lastWorker) return;
    lastWorker = worker;
    worker.postMessage({ type: "CACHE_URLS", urls: assetUrls });
  };

  const start = async () => {
    try {
      await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
      const registration = await navigator.serviceWorker.ready;
      const worker = registration.active ?? registration.waiting ?? registration.installing;
      if (!worker) throw new Error("Service Worker is not available");
      prepareOfflineCache(worker);
    } catch (error) {
      onError?.(error);
    }
  };

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    lastWorker = null;
    prepareOfflineCache(navigator.serviceWorker.controller);
  });

  // iPad Safariでも登録機会を逃さないよう、画像のload完了を待たずに開始します。
  void start();
}
