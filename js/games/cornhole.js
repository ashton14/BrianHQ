// ========= CORNHOLE — drag from the bag toward the board, release =========
import { createLoop, attachDragAim, stepBody, launchVector } from "./engine.js";
import { px, skyBands, cloud, trajectory, powerMeter, text, startSpot, aimLine,
         makeSparkles, stepSparkles, drawSparkles } from "../pixel/sprites.js";
import { get, set } from "../storage.js";

const W = 900, H = 260, GROUND = 228;
const GRAVITY = 1500, MAX_PULL = 170, MAX_SPEED = 1000;
const BAG_W = 18, BAG_H = 12, HW = BAG_W / 2, HH = BAG_H / 2;

// The board: a ramp rising to the right, with the hole cut near the top.
const BX0 = 560, BY0 = 206, BX1 = 800, BY1 = 150;
const SLOPE = (BY1 - BY0) / (BX1 - BX0);
const HOLE_X = 742, HOLE_R = 15;
const BAGS_PER_ROUND = 4, START_R = 46;
const HINT = "DRAG FROM THE BAG THE WAY YOU WANT IT TO GO";

const boardY = (x) => BY0 + (x - BX0) * SLOPE;

export function initCornhole() {
  const canvas = document.getElementById("corn-canvas");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("corn-score");
  const bestEl = document.getElementById("corn-best");
  const hintEl = document.getElementById("corn-hint");

  const clouds = [{ x: 200, y: 46, s: 1.4, v: 4 }, { x: 640, y: 30, s: 1.0, v: 6 }];

  let bag, state, aim, sparkles, bagsLeft, roundScore, lastPoints, squash, msg, msgUntil, nextTimer;

  function newRound() {
    bagsLeft = BAGS_PER_ROUND;
    roundScore = 0;
    msg = "";
    resetBag();
    paintScore();
  }

  function resetBag() {
    bag = { x: 90, y: GROUND - HH, vx: 0, vy: 0, onBoard: false, done: false, shrink: 1 };
    state = bagsLeft > 0 ? "aim" : "roundover";
    aim = null;
    sparkles = [];
    squash = 0;
    clearTimeout(nextTimer);
  }

  function paintScore() {
    scoreEl.textContent = `ROUND ${roundScore}  ·  BAGS ${bagsLeft}`;
    const best = get("corn.best", 0);
    bestEl.textContent = best ? `best round: ${best} pts` : "no round finished yet";
  }

  function flash(t) { msg = t; msgUntil = performance.now() + 1600; }

  attachDragAim(canvas, {
    getOrigin: () => bag,
    maxPull: MAX_PULL,
    startRadius: START_R,
    enabled: () => state === "aim",
    onMissedStart: () => { hintEl.textContent = "START THE DRAG ON THE BAG"; },
    onAim: (p) => { aim = p; hintEl.textContent = "RELEASE TO SEND IT THAT WAY"; },
    onRelease: (p) => {
      aim = null;
      hintEl.textContent = HINT;
      if (p.power < 0.06) return;
      const v = launchVector(p, MAX_SPEED);
      bag.vx = v.vx;
      bag.vy = v.vy;
      state = "fly";
    },
  });

  document.getElementById("corn-reset").addEventListener("click", newRound);

  function settle(points, label) {
    state = "settled";
    lastPoints = points;
    roundScore += points;
    bagsLeft -= 1;
    flash(label);
    paintScore();

    if (bagsLeft <= 0) {
      const best = get("corn.best", 0);
      if (roundScore > best) set("corn.best", roundScore);
      paintScore();
      nextTimer = setTimeout(() => { state = "roundover"; flash(`ROUND OVER - ${roundScore} PTS`); }, 1400);
    } else {
      nextTimer = setTimeout(resetBag, 1400);
    }
  }

  function update(dt) {
    for (const c of clouds) { c.x += c.v * dt; if (c.x > W + 60) c.x = -80; }
    sparkles = stepSparkles(sparkles, dt);
    if (squash > 0) squash = Math.max(0, squash - dt);
    if (bag.done && bag.shrink > 0) bag.shrink = Math.max(0, bag.shrink - dt * 4);
    if (state !== "fly") return;

    if (bag.onBoard) return slideOnBoard(dt);

    stepBody(bag, dt, GRAVITY);

    // in-flight drop straight into the cup
    if (bag.x > BX0 && bag.x < BX1) {
      const surf = boardY(bag.x);
      if (bag.y + HH >= surf && bag.y + HH <= surf + 22) {
        if (Math.abs(bag.x - HOLE_X) < HOLE_R) return swallow();
        return hitBoard();
      }
    }

    if (bag.y + HH >= GROUND) {
      bag.y = GROUND - HH;
      bag.vy *= -0.12;                       // bags do not bounce, they flop
      bag.vx *= 0.42;
      squash = 0.13;
      if (Math.abs(bag.vy) < 40) bag.vy = 0;
      if (Math.abs(bag.vx) < 14 && bag.vy === 0) return settle(0, "MISS - 0");
    }

    if (bag.x > W - HW) { bag.x = W - HW; bag.vx *= -0.2; }
  }

  function hitBoard() {
    const nlen = Math.hypot(SLOPE, 1);
    const nx = SLOPE / nlen, ny = -1 / nlen;      // surface normal, pointing up-left
    const dx = 1 / nlen, dy = SLOPE / nlen;       // along the ramp, uphill

    const vn = bag.vx * nx + bag.vy * ny;
    const vt = bag.vx * dx + bag.vy * dy;
    const vn2 = vn < 0 ? -vn * 0.15 : vn;
    const vt2 = vt * 0.5;

    bag.vx = vt2 * dx + vn2 * nx;
    bag.vy = vt2 * dy + vn2 * ny;
    bag.y = boardY(bag.x) - HH;
    bag.onBoard = true;
    squash = 0.16;
  }

  function slideOnBoard(dt) {
    // Constrained to the ramp: gravity pulls it back downhill, friction kills it.
    const k = 1 / (1 + SLOPE * SLOPE);
    bag.vx += GRAVITY * SLOPE * k * dt;
    bag.vx *= Math.exp(-2.6 * dt);
    bag.x += bag.vx * dt;
    bag.y = boardY(bag.x) - HH;
    bag.vy = bag.vx * SLOPE;

    if (Math.abs(bag.x - HOLE_X) < HOLE_R) return swallow();

    if (bag.x < BX0 || bag.x > BX1) { bag.onBoard = false; return; }   // off the front or back

    if (Math.abs(bag.vx) < 10) { bag.vx = 0; return settle(1, "ON THE BOARD - 1"); }
  }

  function swallow() {
    bag.x = HOLE_X;
    bag.y = boardY(HOLE_X) - HH;
    bag.vx = bag.vy = 0;
    bag.done = true;
    bag.onBoard = false;
    sparkles = makeSparkles(HOLE_X, boardY(HOLE_X) - 6, 46);
    settle(3, "IN THE HOLE - 3!");
  }

  function draw() {
    skyBands(ctx, W, H, ["#20264f", "#2b3160", "#3a3f77", "#4a4a8c"]);
    for (const c of clouds) cloud(ctx, c.x, c.y, c.s);

    // fence + grass
    for (let x = 0; x < W; x += 26) px(ctx, x, GROUND - 34, 20, 34, "#33241a");
    px(ctx, 0, GROUND - 38, W, 5, "#42301f");
    px(ctx, 0, GROUND, W, H - GROUND, "#256b33");
    px(ctx, 0, GROUND, W, 3, "#37944a");
    for (let x = 10; x < W; x += 31) px(ctx, x, GROUND + 8 + ((x / 31) % 3) * 4, 3, 4, "#37944a");

    drawBoard();
    if (state === "aim" && !aim) startSpot(ctx, bag.x, bag.y, START_R * 0.55);
    if (!bag.done || bag.shrink > 0) drawBag();
    if (state === "aim" && aim) drawAim();
    drawSparkles(ctx, sparkles);

    if (msg && performance.now() < msgUntil) {
      text(ctx, msg, W / 2, 60, 18,
        lastPoints === 3 ? "#ffd23f" : lastPoints === 1 ? "#3ddc84" : "#ff5c57", "center");
    }
    if (state === "roundover") text(ctx, "PRESS NEW ROUND", W / 2, 92, 10, "#f5f0e6", "center");

    text(ctx, `BAGS ${bagsLeft}`, 16, 14, 10, "#f5f0e6");
    text(ctx, `${roundScore} PTS`, W - 16, 14, 10, "#ffd23f", "right");
  }

  function drawBoard() {
    px(ctx, BX0 + 6, BY0, 8, GROUND - BY0, "#3a2a1e");          // front leg
    px(ctx, BX1 - 16, BY1, 8, GROUND - BY1, "#3a2a1e");         // back leg
    for (let x = BX0; x < BX1; x += 4) {
      const y = boardY(x);
      const inHole = Math.abs(x + 2 - HOLE_X) < HOLE_R;
      px(ctx, x, y, 4, 9, inHole ? "#0a0818" : (((x / 4) | 0) % 6 === 0 ? "#c9873f" : "#e0a05a"));
      if (!inHole) px(ctx, x, y + 9, 4, 4, "#8a5a2b");
    }
    px(ctx, HOLE_X - HOLE_R, boardY(HOLE_X) - 1, HOLE_R * 2, 4, "#0a0818");
  }

  function drawBag() {
    const sq = squash > 0 ? squash / 0.16 : 0;
    const w = (BAG_W * (1 + 0.35 * sq)) * bag.shrink;
    const h = (BAG_H * (1 - 0.35 * sq)) * bag.shrink;
    const x = bag.x - w / 2, y = bag.y + HH - h;
    px(ctx, x, y, w, h, "#cd212a");
    px(ctx, x + 2, y + 2, Math.max(0, w - 4), 3, "#e8595a");
    px(ctx, x, y + h - 3, w, 3, "#8f1219");
  }

  function drawAim() {
    aimLine(ctx, bag, aim);
    trajectory(ctx, bag, launchVector(aim, MAX_SPEED), GRAVITY, GROUND);
    powerMeter(ctx, 16, H - 26, 130, 10, aim.power);
    text(ctx, "POWER", 16, H - 44, 8, "#f5f0e6");
  }

  newRound();
  createLoop(update, draw).start();
}
