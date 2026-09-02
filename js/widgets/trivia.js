// ========= DAILY DOUBLE — one Jeopardy-style clue a day =========
import { pickDaily, dateKey } from "../daily.js";
import { get, set } from "../storage.js";

const STATS_KEY = "trivia.stats.v1";

export function initTrivia(bank) {
  const q = pickDaily(bank, 0);
  const board = document.getElementById("jeop-board");
  const catEl = document.getElementById("trivia-cat");
  const valEl = document.getElementById("trivia-value");
  const clueEl = document.getElementById("trivia-clue");
  const ansEl = document.getElementById("trivia-answers");
  const resEl = document.getElementById("trivia-result");
  const statsEl = document.getElementById("trivia-stats");
  const banner = document.getElementById("dd-banner");
  const stamp = document.getElementById("wrong-stamp");
  const canvas = document.getElementById("confetti");

  if (!q) { clueEl.textContent = "No clue for today yet."; return; }

  const dayKey = `trivia.${dateKey()}`;
  const played = get(dayKey, null);   // { picked, correct } once answered

  catEl.textContent = q.category;
  valEl.textContent = `$${q.value}`;
  clueEl.textContent = q.clue;

  const buttons = q.answers.map((text, i) => {
    const b = document.createElement("button");
    b.className = "px-btn";
    b.type = "button";
    b.textContent = text;
    b.addEventListener("click", () => answer(i));
    ansEl.append(b);
    return b;
  });

  function paintStats() {
    const s = get(STATS_KEY, { played: 0, correct: 0, streak: 0, best: 0 });
    statsEl.textContent =
      `${s.correct}/${s.played} right  ·  streak ${s.streak}  ·  best streak ${s.best}`;
  }

  function lock(picked, wasRight) {
    buttons.forEach((b, i) => {
      b.disabled = true;
      if (i === q.correct) b.classList.add("correct");
      else if (i === picked) b.classList.add("wrong");
      else b.classList.add("muted");
    });
    resEl.hidden = false;
    resEl.innerHTML = wasRight
      ? `<b>Correct.</b> Look at you.`
      : `<b>Nope.</b> The answer was <b>${escapeHtml(q.answers[q.correct])}</b>`;
  }

  function answer(picked) {
    if (get(dayKey, null)) return;
    const wasRight = picked === q.correct;

    const s = get(STATS_KEY, { played: 0, correct: 0, streak: 0, best: 0 });
    s.played += 1;
    if (wasRight) {
      s.correct += 1;
      s.streak += 1;
      s.best = Math.max(s.best, s.streak);
    } else {
      s.streak = 0;
    }
    set(STATS_KEY, s);
    set(dayKey, { picked, correct: wasRight });

    lock(picked, wasRight);
    paintStats();
    wasRight ? celebrate() : reject();
  }

  function celebrate() {
    banner.hidden = false;
    board.classList.add("goldflash");
    confetti(canvas);
    setTimeout(() => { banner.hidden = true; board.classList.remove("goldflash"); }, 1700);
  }

  function reject() {
    board.classList.remove("shake");
    void board.offsetWidth;
    board.classList.add("shake");
    stamp.hidden = false;
    setTimeout(() => { stamp.hidden = true; board.classList.remove("shake"); }, 1600);
  }

  if (played) {
    lock(played.picked, played.correct);
  }
  paintStats();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/** Chunky square pixel confetti — no library, ~1.4s, then it stops cleanly. */
function confetti(canvas) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const colors = ["#ffd23f", "#3ddc84", "#ff5cc8", "#4ad6ff", "#f5f0e6"];
  const bits = Array.from({ length: 70 }, () => ({
    x: W / 2 + (Math.random() - 0.5) * 160,
    y: H * 0.55,
    vx: (Math.random() - 0.5) * 460,
    vy: -260 - Math.random() * 320,
    s: 5 + Math.floor(Math.random() * 4) * 2,
    c: colors[(Math.random() * colors.length) | 0],
  }));

  let last = performance.now();
  const end = last + 1500;

  (function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    ctx.clearRect(0, 0, W, H);
    for (const b of bits) {
      b.vy += 900 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      ctx.fillStyle = b.c;
      ctx.fillRect(Math.round(b.x), Math.round(b.y), b.s, b.s);
    }
    if (now < end) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, W, H);
  })(last);
}
