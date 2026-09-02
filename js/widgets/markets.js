// ========= MARKET WATCH — S&P / NASDAQ / DOW, links to E*TRADE =========
import { CONFIG } from "../config.js";
import { loadWithCache, errorState, clockStamp } from "../net.js";

const LABELS = { ".SPX": "S&P 500", ".IXIC": "NASDAQ", ".DJI": "DOW" };
const ORDER = [".SPX", ".IXIC", ".DJI"];

/** The single adapter function. Swapping data providers means changing only this. */
function parseMarkets(json) {
  const raw = json?.FormattedQuoteResult?.FormattedQuote;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const bySym = new Map(list.map((q) => [q.symbol, q]));
  return ORDER.filter((s) => bySym.has(s)).map((s) => {
    const q = bySym.get(s);
    const chg = num(q.change);
    return {
      symbol: s,
      name: LABELS[s] || q.shortName || s,
      last: q.last ?? "--",
      lastNum: num(q.last),
      change: q.change ?? "--",
      changePct: q.change_pct ?? "--",
      dir: chg > 0 ? 1 : chg < 0 ? -1 : 0,
      status: q.curmktstatus || "",
      when: q.last_timedate || "",
    };
  });
}

const num = (s) => Number(String(s ?? "").replace(/,/g, "")) || 0;

const STATUS_TEXT = {
  REG_MKT: ["MARKET OPEN", "open"],
  PRE_MKT: ["PRE-MARKET", "open"],
  POST_MKT: ["AFTER HOURS", "open"],
};

export function initMarkets() {
  const body = document.getElementById("markets-body");
  const badge = document.getElementById("markets-status");
  const stamp = document.getElementById("markets-stamp");
  const bull = document.getElementById("bull-bear");
  document.getElementById("link-etrade").href = CONFIG.links.etrade;

  const prev = new Map();
  let timer = null;

  async function refresh() {
    try {
      const { data, at, fresh } = await loadWithCache(CONFIG.markets.url, {
        cacheKey: CONFIG.markets.cacheKey,
        ttlMs: Infinity,
      });
      const rows = parseMarkets(data);
      if (!rows.length) throw new Error("no quotes in payload");
      render(rows);

      const [text, cls] = STATUS_TEXT[rows[0].status] || ["MARKET CLOSED", "closed"];
      badge.textContent = text;
      badge.className = `mkt-badge ${cls}`;
      stamp.textContent = fresh
        ? `updated ${clockStamp(at)}`
        : `offline — last good ${clockStamp(at)}`;
    } catch (err) {
      body.replaceChildren(errorState("Wall Street isn't picking up. Try again in a bit."));
      badge.textContent = "NO SIGNAL";
      badge.className = "mkt-badge";
      stamp.textContent = "";
      console.warn("[markets]", err);
    }
  }

  function render(rows) {
    const frag = document.createDocumentFragment();
    let ups = 0;

    for (const r of rows) {
      if (r.dir > 0) ups++;
      const row = document.createElement("div");
      row.className = "mkt-row";

      const name = document.createElement("span");
      name.className = "mkt-name";
      name.textContent = r.name;

      const last = document.createElement("span");
      last.className = "mkt-last";
      const before = prev.get(r.symbol);
      if (before != null && before !== r.lastNum) {
        row.classList.add("pulsed");
        countUp(last, before, r.lastNum);
      } else {
        last.textContent = r.last;
      }
      prev.set(r.symbol, r.lastNum);

      const chg = document.createElement("span");
      chg.className = `mkt-chg ${r.dir > 0 ? "up" : r.dir < 0 ? "down" : ""}`;
      const arrow = r.dir > 0 ? "▲" : r.dir < 0 ? "▼" : "▬";
      chg.textContent = `${arrow} ${r.change}  (${r.changePct})`;

      row.append(name, last, chg);
      frag.append(row);
    }

    body.replaceChildren(frag);
    bull.innerHTML = ups >= 2 ? bullSprite() : bearSprite();
  }

  // Short digit roll so a tick reads as movement, not a silent swap.
  function countUp(el, from, to) {
    const start = performance.now();
    const dur = 420;
    const fmt = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    (function step(now) {
      const t = Math.min(1, (now - start) / dur);
      el.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = fmt(to);
    })(start);
  }

  function bullSprite() {
    return `<svg viewBox="0 0 14 11" width="56" height="44" shape-rendering="crispEdges">
      <path fill="#3ddc84" d="M2 3h1v1H2zM11 3h1v1h-1zM3 4h8v4H3zM4 8h2v2H4zM8 8h2v2H8zM5 5h1v1H5zM8 5h1v1H8z"/>
      <path fill="#0a0818" d="M5 5h1v1H5zM8 5h1v1H8z"/>
      <path fill="#ffd23f" d="M1 1h2v2H1zM11 1h2v2h-2z"/></svg>`;
  }
  function bearSprite() {
    return `<svg viewBox="0 0 14 11" width="56" height="44" shape-rendering="crispEdges">
      <path fill="#ff5c57" d="M3 2h8v6H3zM4 8h2v2H4zM8 8h2v2H8zM2 1h2v2H2zM10 1h2v2h-2z"/>
      <path fill="#0a0818" d="M5 4h1v1H5zM8 4h1v1H8zM6 6h2v1H6z"/></svg>`;
  }

  // Only the *polling* is visibility-gated — a page opened in a background tab
  // still has to fill itself in, or it's blank the moment he switches to it.
  function schedule() {
    clearInterval(timer);
    if (document.visibilityState === "visible") {
      timer = setInterval(refresh, CONFIG.markets.refreshMs);
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refresh();
    schedule();
  });

  refresh();
  schedule();
}
