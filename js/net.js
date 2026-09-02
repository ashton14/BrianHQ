// ========= fetch with a timeout, a cache, and a soft landing =========
import { getCached, setCached } from "./storage.js";

export async function fetchJSON(url, { timeoutMs = 6000, signal } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  if (signal) signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  try {
    const res = await fetch(url, { signal: ctrl.signal, mode: "cors", credentials: "omit" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Live-first, cache-on-success, stale-on-failure.
 * Returns { data, at, fresh }. Throws only when live fails AND no cache exists.
 */
export async function loadWithCache(url, { cacheKey, ttlMs, timeoutMs }) {
  try {
    const data = await fetchJSON(url, { timeoutMs });
    setCached(cacheKey, data);
    return { data, at: Date.now(), fresh: true };
  } catch (err) {
    const cached = getCached(cacheKey, ttlMs ?? Infinity);
    if (cached) return { data: cached.data, at: cached.at, fresh: false };
    throw err;
  }
}

export function errorState(message) {
  const el = document.createElement("div");
  el.className = "err-state";
  el.innerHTML = `<div class="tv-broke" aria-hidden="true"></div><div></div>`;
  el.lastElementChild.textContent = message;
  return el;
}

/** "4:12 PM" for freshness stamps. */
export function clockStamp(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
