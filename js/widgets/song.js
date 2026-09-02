// ========= SONG OF THE DAY — one 70s/80s/90s rock cut per day =========
import { pickDaily } from "../daily.js";

function watchUrl(song) {
  // videoId is optional by design: a verified ID gets a direct link, anything
  // unverified falls back to a search that is guaranteed to resolve.
  if (song.videoId) return `https://www.youtube.com/watch?v=${encodeURIComponent(song.videoId)}`;
  const q = encodeURIComponent(`${song.artist} ${song.title} official video`);
  return `https://www.youtube.com/results?search_query=${q}`;
}

export function initSong(songs) {
  const body = document.getElementById("song-body");
  const badge = document.getElementById("song-decade");
  const song = pickDaily(songs, 0);

  if (!song) {
    body.textContent = "No songs in the crate yet.";
    return;
  }

  badge.textContent = song.decade.toUpperCase();
  badge.className = `tile-go decade-badge d${song.decade.replace(/\D/g, "")}`;

  const wrap = document.createElement("div");
  wrap.className = "song-main";

  const vinyl = document.createElement("div");
  vinyl.className = "vinyl";
  vinyl.setAttribute("aria-hidden", "true");

  const meta = document.createElement("div");
  meta.className = "song-meta";

  const t = document.createElement("h3");
  t.className = "song-title";
  t.textContent = song.title;

  const a = document.createElement("p");
  a.className = "song-artist";
  a.textContent = song.artist;

  const y = document.createElement("p");
  y.className = "song-year";
  y.textContent = song.year;

  const play = document.createElement("a");
  play.className = "px-btn small song-play";
  play.href = watchUrl(song);
  play.target = "_blank";
  play.rel = "noopener";
  play.textContent = "▶ PLAY IT";

  meta.append(t, a, y, play);
  wrap.append(vinyl, meta);
  body.replaceChildren(wrap);
}
