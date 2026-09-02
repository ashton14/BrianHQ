// ========= SPORTSDESK — newest headlines across a few ESPN feeds =========
import { CONFIG } from "../config.js";
import { fetchJSON, errorState, clockStamp } from "../net.js";
import { getCached, setCached } from "../storage.js";

function timeAgo(iso) {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function initEspn() {
  const body = document.getElementById("espn-body");
  const stamp = document.getElementById("espn-stamp");
  document.getElementById("link-espn").href = CONFIG.links.espn;

  async function load() {
    // One feed failing must not empty the tile, so settle rather than race.
    const results = await Promise.allSettled(
      CONFIG.espn.feeds.map(async (f) => ({
        chip: f.chip,
        json: await fetchJSON(f.url, { timeoutMs: 7000 }),
      }))
    );

    const seen = new Set();
    const items = [];
    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      for (const a of r.value.json?.articles ?? []) {
        const href = a?.links?.web?.href;
        if (!href || seen.has(a.id)) continue;
        seen.add(a.id);
        items.push({
          chip: r.value.chip,
          headline: a.headline || a.description || "(untitled)",
          href,
          published: a.published || a.lastModified || "",
        });
      }
    }
    items.sort((a, b) => Date.parse(b.published || 0) - Date.parse(a.published || 0));
    return items.slice(0, CONFIG.espn.count);
  }

  function render(items, at, fresh) {
    const frag = document.createDocumentFragment();
    items.forEach((it, i) => {
      const row = document.createElement("div");
      row.className = "news-row";
      row.style.setProperty("--i", i);

      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = it.chip;

      const wrap = document.createElement("div");
      const a = document.createElement("a");
      a.className = "news-link";
      a.href = it.href;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = it.headline;

      const ago = document.createElement("div");
      ago.className = "news-ago";
      ago.textContent = timeAgo(it.published);

      wrap.append(a, ago);
      row.append(chip, wrap);
      frag.append(row);
    });
    body.replaceChildren(frag);
    stamp.textContent = fresh ? `updated ${clockStamp(at)}` : `offline — last good ${clockStamp(at)}`;
  }

  async function refresh() {
    try {
      const items = await load();
      if (!items.length) throw new Error("no articles");
      setCached(CONFIG.espn.cacheKey, items);
      render(items, Date.now(), true);
    } catch (err) {
      const cached = getCached(CONFIG.espn.cacheKey, Infinity);
      if (cached) render(cached.data, cached.at, false);
      else {
        body.replaceChildren(errorState("The sports wire is down. Nothing to report."));
        stamp.textContent = "";
      }
      console.warn("[espn]", err);
    }
  }

  refresh();
  setInterval(() => {
    if (document.visibilityState === "visible") refresh();
  }, CONFIG.espn.refreshMs);
}
