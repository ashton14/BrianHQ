// ========= BRIAN'S HQ — boot =========
// Every widget starts inside its own guard: one dead API or one bad data file
// must never take the rest of the page down.

import { initClock, initStarfield, initPhoto } from "./widgets/clock.js";
import { initMarkets } from "./widgets/markets.js";
import { initEspn } from "./widgets/espn.js";
import { initSong } from "./widgets/song.js";
import { initShorts } from "./widgets/shorts.js";
import { initTrivia } from "./widgets/trivia.js";
import { initGolf } from "./games/golf.js";
import { initCornhole } from "./games/cornhole.js";

function boot(name, fn) {
  try { fn(); } catch (err) { console.error(`[boot:${name}]`, err); }
}

async function loadBank(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  const json = await res.json();
  if (!Array.isArray(json)) throw new Error(`${path} is not an array`);
  return json;
}

async function start() {
  boot("chrome", initClock);
  boot("starfield", initStarfield);
  boot("photo", initPhoto);

  boot("markets", initMarkets);
  boot("espn", initEspn);
  boot("golf", initGolf);
  boot("cornhole", initCornhole);

  const [songs, trivia, nags] = await Promise.allSettled([
    loadBank("data/songs.json"),
    loadBank("data/trivia.json"),
    loadBank("data/shorts-nags.json"),
  ]);

  const val = (r, label) => {
    if (r.status === "fulfilled") return r.value;
    console.error(`[data:${label}]`, r.reason);
    return [];
  };

  boot("song", () => initSong(val(songs, "songs")));
  boot("trivia", () => initTrivia(val(trivia, "trivia")));
  boot("shorts", () => initShorts(val(nags, "shorts-nags")));
}

start();
