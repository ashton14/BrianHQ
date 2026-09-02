# Brian's HQ

A pixel-arcade home page: market numbers, sports headlines, a song and a trivia
question that change every day, a nagging Shorts timer, and two mini-games.

**Live:** https://ashton14.github.io/BrianHQ/

## Run it locally

ES modules and `fetch("data/*.json")` do not work over `file://`, so use a server:

```
npx serve .
```

Then open the printed URL (usually http://localhost:3000).

## How it fits together

No build step, no dependencies, no API keys. Plain HTML + CSS + ES modules.

```
index.html          the whole page
css/                theme (palette, pixel primitives), layout, pixel art, animations
js/config.js        every tunable: links, jersey number, refresh intervals
js/daily.js         the day-of-year seed everything daily reads from
js/net.js           fetch with timeout + cache + stale fallback
js/widgets/         markets, espn, song, shorts, trivia, clock
js/games/           engine (loop + drag aim + physics), golf, cornhole
js/pixel/sprites.js canvas drawing helpers
data/               songs.json, trivia.json, shorts-nags.json — 366 entries each
tools/              validation and endpoint health scripts
```

### Live data

Both sources are keyless and CORS-open, which is why no backend is needed.

| Tile | Source |
|---|---|
| Market Watch | CNBC public quote service (`.SPX`, `.IXIC`, `.DJI`) |
| Sportsdesk | ESPN site API — NFL, NBA, MLB and PGA news feeds, merged and sorted |

Each caches its last good response in `localStorage`, so a dead endpoint shows
yesterday's numbers dimmed rather than an empty tile.

### Daily rotation

`js/daily.js` picks by day of year — the same all day, new at local midnight,
nothing stored. Add `?date=2026-12-25` to any URL to see another day's content.

## Adding content

Append to any file in `data/` and run the validator. `pickDaily` is
length-agnostic, so nothing breaks at any bank size.

```
node tools/validate-data.mjs      # schema, counts, duplicates
node tools/check-apis.mjs         # are CNBC and ESPN still up and CORS-open?
node tools/check-youtube-ids.mjs  # only needed once songs carry videoIds
```

### Song links

`songs.json` entries may carry an optional `videoId`. With one, "PLAY IT" opens
that video directly; without, it opens a YouTube search for the artist and title.
Every song currently uses the search fallback — the links always resolve, they
just cost one extra click. To upgrade a song, add its `videoId` and run
`node tools/check-youtube-ids.mjs`, which verifies the id is alive *and* is
actually that song. `--fix` strips any that fail.

## The family photo

Drop a square-ish `family.jpeg` into `assets/`. Until then the polaroid frame
shows a placeholder and the layout is already correct. The caption comes from
`photoCaption` in `js/config.js`.

## Deploy

Push to `main`. GitHub Pages serves the repo root (`.nojekyll` is present so
`js/` and `data/` are served as-is).
