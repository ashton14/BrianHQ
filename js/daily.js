// ========= the one source of "what day is it" =========
// Deterministic: same answer all day, new answer at local midnight, nothing stored.
// `?date=YYYY-MM-DD` overrides so rotation is testable without waiting a year.

let override = null;
try {
  const q = new URLSearchParams(location.search).get("date");
  if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) {
    const [y, m, d] = q.split("-").map(Number);
    const probe = new Date(y, m - 1, d);
    if (!Number.isNaN(probe.getTime())) override = probe;
  }
} catch { /* ignore */ }

export function today() {
  return override ? new Date(override) : new Date();
}

export function isOverridden() { return override !== null; }

/** 1..366, computed from LOCAL calendar fields (never UTC). */
export function dayOfYear(d = today()) {
  const start = new Date(d.getFullYear(), 0, 1);
  const here = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((here - start) / 86_400_000) + 1;
}

/** Local YYYY-MM-DD — used for per-day storage keys. */
export function dateKey(d = today()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Pick today's entry from a bank. Length-agnostic on purpose: a 40-entry seed
 * bank and a full 365-entry bank both work, the short one just repeats sooner.
 * `offset` de-correlates the banks so song/trivia/nag don't march in lockstep.
 */
export function pickDaily(bank, offset = 0) {
  if (!Array.isArray(bank) || bank.length === 0) return null;
  return bank[(dayOfYear() - 1 + offset) % bank.length];
}
