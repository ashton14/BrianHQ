// ========= SHORTS WATCH — the daily nag + a (cheerfully approximate) timer =========
import { CONFIG } from "../config.js";
import { pickDaily, dateKey } from "../daily.js";
import { get, set, remove } from "../storage.js";

const FACE_LABELS = ["we're fine", "hmm", "concerning", "call someone"];

// Ten ways of saying the same thing. Rotates by day so the alarm doesn't become
// wallpaper — he sees a different one each time it goes off.
const ALARMS = [
  "That's thirty minutes. Close the laptop and go outside.",
  "Half an hour, gone. Stand up. Right now. I'll wait.",
  "Thirty minutes of Shorts. The computer wins. Turn it off.",
  "Time's up. Nothing good is happening down there. Go.",
  "Thirty. Minutes. Put the phone down and walk somewhere.",
  "That's the whole allowance. Get off the computer.",
  "You've hit thirty. The clubs are in the garage. Go use them.",
  "Thirty minutes and the scroll is still undefeated. Quit while you're behind.",
  "That's a full half hour. Shut it down and go do a real thing.",
  "Thirty minutes. Enough. Log off, Brian.",
];

function fmt(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
}

export function initShorts(nags) {
  const body = document.getElementById("shorts-body");
  const link = document.getElementById("link-shorts");
  link.href = CONFIG.links.shorts;

  const key = `shorts.${dateKey()}`;
  const nag = pickDaily(nags, 0) ?? "Go easy on those, alright?";

  body.innerHTML = `
    <p class="nag"></p>
    <div class="dmg-row">
      <div class="face f0" id="dmg-face" aria-hidden="true">
        <span class="eye l"></span><span class="eye r"></span><span class="mouth"></span>
      </div>
      <div class="dmg-meta">
        <div class="dmg-label">TODAY'S DAMAGE &mdash; <span id="dmg-verdict">we're fine</span></div>
        <div class="dmg-time" id="dmg-time">0s</div>
        <div class="dmg-bar"><div class="dmg-fill" id="dmg-fill"></div></div>
      </div>
    </div>
    <button class="dmg-reset" id="dmg-reset" type="button">reset it (liar)</button>
  `;
  body.querySelector(".nag").textContent = nag;

  const face = document.getElementById("dmg-face");
  const timeEl = document.getElementById("dmg-time");
  const fill = document.getElementById("dmg-fill");
  const verdict = document.getElementById("dmg-verdict");

  const awayKey = `${key}.away`;
  const armedKey = `${key}.armed`;
  const alarmKey = `${key}.alarmed`;
  const CAP = 3 * 3600;   // no single trip counts for more than three hours
  const FULL = CONFIG.shorts.full;   // minutes: bar maxes out, alarm fires

  let seconds = get(key, 0);
  // Once he clicks through, the tab stays armed for the rest of the day: every
  // later trip back to that Shorts tab counts too, not just the first one.
  let armed = get(armedKey, false);
  let awaySince = get(awayKey, null);   // survives a reload mid-trip
  let alarmed = get(alarmKey, false);   // the popup is a once-a-day event
  let lastTier = -1;

  function paint() {
    const mins = seconds / 60;
    const t = CONFIG.shorts.faces;
    const tier = mins >= t[3] ? 3 : mins >= t[2] ? 2 : mins >= t[1] ? 1 : 0;

    timeEl.textContent = fmt(seconds);
    face.className = `face f${tier}`;
    verdict.textContent = FACE_LABELS[tier];

    const pct = Math.min(100, (mins / FULL) * 100);
    fill.style.width = `${pct}%`;
    fill.style.background = tier >= 3 ? "var(--red)" : tier >= 1 ? "var(--gold)" : "var(--green)";
    timeEl.style.color = tier >= 3 ? "var(--red)" : tier >= 1 ? "var(--gold)" : "var(--green)";

    if (tier > lastTier && lastTier !== -1) {
      face.classList.remove("shake");
      void face.offsetWidth;      // restart the animation
      face.classList.add("shake");
    }
    lastTier = tier;

    if (mins >= FULL && !alarmed) {
      alarmed = true;
      set(alarmKey, true);
      showAlarm();
    }
  }

  // ---- the "you're done" popup ----------------------------------------------
  let scrim = null;
  let lastFocus = null;

  function closeAlarm() {
    if (!scrim) return;
    scrim.hidden = true;
    document.removeEventListener("keydown", onAlarmKey);
    try { lastFocus?.focus(); } catch { /* element may be gone */ }
  }

  function onAlarmKey(e) {
    if (e.key === "Escape") closeAlarm();
  }

  function showAlarm() {
    if (!scrim) {
      scrim = document.createElement("div");
      scrim.className = "alarm-scrim";
      scrim.innerHTML = `
        <div class="alarm-box" role="alertdialog" aria-modal="true"
             aria-labelledby="alarm-title" aria-describedby="alarm-msg">
          <div class="alarm-title" id="alarm-title">TIME'S UP</div>
          <p class="alarm-msg" id="alarm-msg"></p>
          <button class="px-btn alarm-ok" type="button">FINE. I'M GOING.</button>
        </div>
      `;
      scrim.querySelector(".alarm-msg").textContent =
        pickDaily(ALARMS, 3) ?? ALARMS[0];
      scrim.addEventListener("click", (e) => { if (e.target === scrim) closeAlarm(); });
      scrim.querySelector(".alarm-ok").addEventListener("click", closeAlarm);
      document.body.appendChild(scrim);
    }
    lastFocus = document.activeElement;
    scrim.hidden = false;
    document.addEventListener("keydown", onAlarmKey);
    scrim.querySelector(".alarm-ok").focus();
  }

  function leave() {
    if (!armed || awaySince) return;
    awaySince = Date.now();
    set(awayKey, awaySince);
  }

  function comeBack() {
    if (!awaySince) return;
    seconds += Math.min((Date.now() - awaySince) / 1000, CAP);
    awaySince = null;
    remove(awayKey);
    set(key, seconds);
  }

  // A static page can't watch another tab, so we time how long he's gone *after*
  // clicking through. Approximate on purpose — the copy owns that.
  link.addEventListener("click", () => {
    armed = true;
    set(armedKey, true);
    leave();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") { comeBack(); paint(); }
    else leave();
  });

  document.getElementById("dmg-reset").addEventListener("click", () => {
    seconds = 0; awaySince = null; armed = false; alarmed = false; lastTier = -1;
    remove(key); remove(awayKey); remove(armedKey); remove(alarmKey);
    closeAlarm();
    paint();
  });

  // Reloaded mid-trip, or landed here already visible: settle the clock first.
  if (document.visibilityState === "visible") comeBack();
  else leave();
  paint();
}
