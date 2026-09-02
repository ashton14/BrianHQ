// ========= header clock + marquee =========
import { CONFIG } from "../config.js";
import { today, isOverridden } from "../daily.js";

const GREETINGS = [
  "WELCOME BACK, COMMANDER",
  "THE MARKET DOESN'T CARE ABOUT YOUR FEELINGS",
  "CHECK THE SCORES. THEN THE PORTFOLIO. THEN THE GOLF.",
  "TODAY'S FORECAST: MOSTLY PROCRASTINATION",
  "PRESS START",
];

export function initClock() {
  const dateEl = document.getElementById("clock-date");
  const timeEl = document.getElementById("clock-time");
  const marquee = document.getElementById("marquee");
  const foot = document.getElementById("foot-note");

  const d = today();
  dateEl.textContent = d.toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  }) + (isOverridden() ? "  (time travel)" : "");

  const tick = () => {
    // The clock is always real time even when the daily content is date-overridden.
    timeEl.textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
  };
  tick();
  setInterval(tick, 1000);

  const g = GREETINGS[d.getDay() % GREETINGS.length];
  marquee.textContent = `${g}  ***  ${CONFIG.owner.toUpperCase()}'S HQ  ***  ${g}  ***`;
  foot.textContent = `${CONFIG.owner.toUpperCase()}'S HQ  ·  built with love and pixels`;

  document.getElementById("jersey-num").textContent = CONFIG.jerseyNumber;
  document.getElementById("photo-caption").textContent = CONFIG.photoCaption;
}

export function initStarfield() {
  const field = document.getElementById("starfield");
  const frag = document.createDocumentFragment();
  for (let i = 0; i < 46; i++) {
    const s = document.createElement("div");
    s.className = i % 7 === 0 ? "star big" : "star";
    s.style.left = `${Math.random() * 100}%`;
    s.style.top = `${Math.random() * 100}%`;
    s.style.setProperty("--tw", `${2.5 + Math.random() * 4}s`);
    s.style.setProperty("--td", `${Math.random() * 4}s`);
    frag.append(s);
  }
  field.append(frag);
}

export function initPhoto() {
  const img = document.getElementById("family-photo");
  const ph = document.getElementById("photo-placeholder");
  // Layout must be correct before the real photo ever lands in /assets.
  img.addEventListener("error", () => {
    img.classList.add("missing");
    ph.classList.add("show");
  });
  if (img.complete && img.naturalWidth === 0) img.dispatchEvent(new Event("error"));
}
