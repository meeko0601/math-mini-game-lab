export function registerPwa({ assetUrls = [], onReady, onError } = {}) {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

  const handleMessage = (event) => {
    if (event.data?.type === "OFFLINE_READY") onReady?.(event.data);
    if (event.data?.type === "OFFLINE_ERROR") {
      onError?.(new Error(event.data.message ?? "Offline cache failed"));
    }
  };
  navigator.serviceWorker.addEventListener("message", handleMessage);

  const start = async () => {
    try {
      await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
      const registration = await navigator.serviceWorker.ready;
      const worker = registration.active ?? registration.waiting ?? registration.installing;
      if (!worker) throw new Error("Service Worker is not available");
      worker.postMessage({ type: "CACHE_URLS", urls: assetUrls });
    } catch (error) {
      onError?.(error);
    }
  };

  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
}
