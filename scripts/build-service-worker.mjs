import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { OFFLINE_ASSET_URLS } from "../client/src/config/games.js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = resolve(projectRoot, "dist");
const indexPath = resolve(distRoot, "index.html");
const manifestPath = resolve(distRoot, "manifest.json");
const serviceWorkerPath = resolve(distRoot, "sw.js");

const [indexHtml, manifestJson, serviceWorkerTemplate] = await Promise.all([
  readFile(indexPath, "utf8"),
  readFile(manifestPath, "utf8"),
  readFile(serviceWorkerPath, "utf8"),
]);

const manifest = JSON.parse(manifestJson);
const linkedUrls = [...indexHtml.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["']/gi)]
  .map((match) => match[1])
  .filter((url) => !url.startsWith("data:"));
const iconUrls = (manifest.icons ?? []).map((icon) => icon.src);

const normalizeUrl = (url) => {
  const parsed = new URL(url, "https://offline.invalid/");
  return `${parsed.pathname}${parsed.search}`;
};

const precacheUrls = [...new Set([
  "/",
  "/index.html",
  "/manifest.json",
  ...linkedUrls,
  ...iconUrls,
  ...OFFLINE_ASSET_URLS,
].map(normalizeUrl))].sort();

const buildHash = createHash("sha256")
  .update(serviceWorkerTemplate)
  .update(JSON.stringify(precacheUrls));
for (const url of precacheUrls) {
  const pathname = new URL(url, "https://offline.invalid/").pathname;
  const filePath = pathname === "/" ? indexPath : resolve(distRoot, `.${decodeURIComponent(pathname)}`);
  buildHash.update(await readFile(filePath));
}
const buildVersion = buildHash.digest("hex").slice(0, 12);

const serviceWorker = serviceWorkerTemplate
  .replace('"__PWA_BUILD_VERSION__"', JSON.stringify(buildVersion))
  .replace('["__PWA_PRECACHE_MANIFEST__"]', JSON.stringify(precacheUrls, null, 2));

if (serviceWorker.includes("__PWA_")) {
  throw new Error("Service Worker placeholders were not replaced");
}

await writeFile(serviceWorkerPath, serviceWorker, "utf8");
console.log(`Service Worker ${buildVersion}: ${precacheUrls.length} files prepared for offline use.`);
