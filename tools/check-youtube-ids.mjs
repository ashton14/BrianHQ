// node tools/check-youtube-ids.mjs [--fix]
//
// Songs carry an OPTIONAL videoId. A present id must be both alive and the right
// song, or the "PLAY IT" button sends Brian somewhere wrong — worse than the
// search-URL fallback. YouTube's oEmbed endpoint answers both questions: it 200s
// with the real title and channel for a live id, and errors for a dead one.
//
//   (no flag)  report only
//   --fix      strip every id that fails, so those songs fall back to search

import { readFileSync, writeFileSync } from "node:fs";

const FIX = process.argv.includes("--fix");
const PATH = "data/songs.json";
const songs = JSON.parse(readFileSync(PATH, "utf8"));
const targets = songs.map((s, i) => ({ s, i })).filter(({ s }) => s.videoId);

if (!targets.length) {
  console.log("No videoIds in songs.json — every song uses the YouTube search fallback. Nothing to check.");
  process.exit(0);
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const bad = [];

console.log(`Checking ${targets.length} video ids against YouTube oEmbed...\n`);

for (const { s, i } of targets) {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${s.videoId}`)}&format=json`;
  const label = `${s.artist} - ${s.title}`;
  try {
    const res = await fetch(url);
    if (!res.ok) { bad.push({ i, label, why: `dead id (HTTP ${res.status})` }); console.log(`DEAD  ${label}`); }
    else {
      const j = await res.json();
      const hay = norm(`${j.author_name} ${j.title}`);
      // A live id for the wrong song is the sneaky failure, so match on both fields.
      if (!hay.includes(norm(s.title)) && !hay.includes(norm(s.artist))) {
        bad.push({ i, label, why: `id resolves to "${j.author_name} - ${j.title}"` });
        console.log(`WRONG ${label}\n      -> "${j.author_name} - ${j.title}"`);
      } else console.log(`ok    ${label}`);
    }
  } catch (err) {
    bad.push({ i, label, why: err.message });
    console.log(`ERR   ${label}: ${err.message}`);
  }
  await new Promise((r) => setTimeout(r, 250));      // ~4 req/sec, stay polite
}

console.log(`\n${targets.length - bad.length} ok, ${bad.length} problem(s).`);
if (bad.length && FIX) {
  for (const b of bad) delete songs[b.i].videoId;
  writeFileSync(PATH, "[\n" + songs.map((s) => JSON.stringify(s)).join(",\n") + "\n]\n");
  console.log(`Stripped ${bad.length} bad id(s); those songs now use the search fallback.`);
} else if (bad.length) {
  console.log("Re-run with --fix to strip them, or correct the ids by hand.");
}
process.exit(bad.length && !FIX ? 1 : 0);
