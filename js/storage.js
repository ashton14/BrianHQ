// ========= namespaced, crash-proof localStorage =========
// Private windows and blocked-cookie setups throw on access. Everything degrades
// to "no stored state" rather than taking the page down.

const NS = "bhq.";

export function get(key, fallback = null) {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function set(key, value) {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function remove(key) {
  try { localStorage.removeItem(NS + key); } catch { /* ignore */ }
}

/** Cache with a timestamp. Returns { data, at, stale } or null. */
export function getCached(key, ttlMs) {
  const hit = get(key);
  if (!hit || typeof hit.at !== "number") return null;
  return { data: hit.data, at: hit.at, stale: Date.now() - hit.at > ttlMs };
}

export function setCached(key, data) {
  return set(key, { data, at: Date.now() });
}
