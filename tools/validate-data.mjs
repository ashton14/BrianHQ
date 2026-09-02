// node tools/validate-data.mjs — schema, count and duplicate checks on the daily banks.
import { readFileSync } from "node:fs";

const MIN = 365;                       // pickDaily is length-agnostic, but a short bank repeats
let failures = 0;

const fail = (msg) => { console.error(`  FAIL  ${msg}`); failures++; };
const ok = (msg) => console.log(`  ok    ${msg}`);

function load(path) {
  const json = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(json)) throw new Error(`${path} is not an array`);
  return json;
}

console.log("\nsongs.json");
{
  const songs = load("data/songs.json");
  songs.length >= MIN ? ok(`${songs.length} entries`) : fail(`only ${songs.length} entries (want >= ${MIN})`);

  const keys = new Set();
  for (const [i, s] of songs.entries()) {
    const at = `entry ${i + 1} (${s.artist} - ${s.title})`;
    if (!s.artist || !s.title) fail(`${at}: missing artist or title`);
    if (!(s.year >= 1970 && s.year <= 1999)) fail(`${at}: year ${s.year} outside 1970-1999`);
    const expected = `${String(s.year).slice(2, 3)}0s`;
    if (s.decade !== expected) fail(`${at}: decade ${s.decade} does not match year ${s.year}`);
    if (s.videoId && !/^[\w-]{11}$/.test(s.videoId)) fail(`${at}: videoId is not 11 chars`);
    const key = `${s.artist}|${s.title}`.toLowerCase();
    if (keys.has(key)) fail(`${at}: duplicate song`);
    keys.add(key);
  }
  const withId = songs.filter((s) => s.videoId).length;
  ok(`${withId} of ${songs.length} have a verified videoId (rest fall back to YouTube search)`);
}

console.log("\ntrivia.json");
{
  const bank = load("data/trivia.json");
  bank.length >= MIN ? ok(`${bank.length} entries`) : fail(`only ${bank.length} entries (want >= ${MIN})`);

  const clues = new Set();
  const spread = [0, 0, 0];
  for (const [i, q] of bank.entries()) {
    const at = `entry ${i + 1}`;
    if (!q.category || !q.clue) fail(`${at}: missing category or clue`);
    if (!Number.isInteger(q.value)) fail(`${at}: value is not an integer`);
    if (!Array.isArray(q.answers) || q.answers.length !== 3) fail(`${at}: needs exactly 3 answers`);
    if (!(q.correct >= 0 && q.correct <= 2)) fail(`${at}: correct index ${q.correct} out of range`);
    if (new Set(q.answers).size !== 3) fail(`${at}: duplicate answer text`);
    if (clues.has(q.clue)) fail(`${at}: duplicate clue`);
    clues.add(q.clue);
    spread[q.correct]++;
  }
  const skew = Math.max(...spread) / bank.length;
  skew < 0.5 ? ok(`answer position spread ${spread.join("/")}`)
             : fail(`answers cluster in one position: ${spread.join("/")}`);
}

console.log("\nshorts-nags.json");
{
  const nags = load("data/shorts-nags.json");
  nags.length >= MIN ? ok(`${nags.length} entries`) : fail(`only ${nags.length} entries (want >= ${MIN})`);

  const seen = new Set();
  for (const [i, n] of nags.entries()) {
    if (typeof n !== "string" || !n.trim()) fail(`entry ${i + 1}: not a non-empty string`);
    if (n.length > 110) fail(`entry ${i + 1}: ${n.length} chars, will overflow the tile`);
    if (seen.has(n)) fail(`entry ${i + 1}: duplicate — "${n}"`);
    seen.add(n);
  }
  ok(`longest is ${Math.max(...nags.map((n) => n.length))} chars`);
}

console.log(failures ? `\n${failures} problem(s) found.\n` : "\nAll banks valid.\n");
process.exit(failures ? 1 : 0);
