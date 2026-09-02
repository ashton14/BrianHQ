// ========= BACKYARD GOLF — drag from the ball toward the flag, release =========
import { createLoop, attachDragAim, stepBody, clamp, launchVector } from "./engine.js";
import { px, skyBands, cloud, trajectory, powerMeter, text, startSpot, aimLine,
         makeSparkles, stepSparkles, drawSparkles } from "../pixel/sprites.js";
import { get, set } from "../storage.js";

const W = 900, H = 260, GROUND = 214;
const BALL_R = 5, GRAVITY = 1500, MAX_PULL = 170, MAX_SPEED = 1000;
const HOLE_R = 15, SWING_MS = 170, CONTACT_AT = 0.55, START_R = 46;

const HINT = "DRAG FROM THE BALL THE WAY YOU WANT IT TO GO";

export function initGolf() {
  const canvas = document.getElementById("golf-canvas");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("golf-score");
  const bestEl = document.getElementById("golf-best");
  const hintEl = document.getElementById("golf-hint");

  const clouds = [
    { x: 120, y: 54, s: 1.6, v: 5 },
    { x: 470, y: 38, s: 1.1, v: 8 },
    { x: 760, y: 66, s: 1.9, v: 3.5 },
  ];

  let ball, hole, strokes, state, aim, swing, sparkles, sinkTimer;

  function newHole(keepScore = false) {
    hole = { x: 520 + Math.random() * 300 };
    ball = { x: 70, y: GROUND - BALL_R, vx: 0, vy: 0, onGround: true };
    if (!keepScore) strokes = 0;
    state = "aim";
    aim = null;
    swing = null;
    sparkles = [];
    clearTimeout(sinkTimer);
    paintScore();
  }

  function paintScore() {
    const best = get("golf.best", null);
    scoreEl.textContent = `STROKES ${strokes}`;
    bestEl.textContent = best ? `best hole: ${best} stroke${best === 1 ? "" : "s"}` : "no hole finished yet";
  }

  attachDragAim(canvas, {
    getOrigin: () => ball,
    maxPull: MAX_PULL,
    startRadius: START_R,
    enabled: () => state === "aim",
    onMissedStart: () => { hintEl.textContent = "START THE DRAG ON THE BALL"; },
    onAim: (p) => {
      aim = p;
      hintEl.textContent = "RELEASE TO SEND IT THAT WAY";
    },
    onRelease: (p) => {
      aim = null;
      hintEl.textContent = HINT;
      if (p.power < 0.06) return;                 // an accidental tap isn't a swing
      state = "swing";
      swing = { t: 0, pull: p, fired: false };
    },
  });

  document.getElementById("golf-reset").addEventListener("click", () => newHole(false));

  function launch(pull) {
    const v = launchVector(pull, MAX_SPEED);
    ball.vx = v.vx;
    ball.vy = v.vy;
    ball.onGround = false;
    strokes += 1;
    paintScore();
    state = "fly";
  }

  function update(dt) {
    for (const c of clouds) { c.x += c.v * dt; if (c.x > W + 60) c.x = -80; }
    sparkles = stepSparkles(sparkles, dt);

    if (state === "swing") {
      swing.t += (dt * 1000) / SWING_MS;
      if (!swing.fired && swing.t >= CONTACT_AT) { swing.fired = true; launch(swing.pull); }
      if (swing.t >= 1) swing = null;
      return;
    }
    if (state !== "fly") return;

    stepBody(ball, dt, GRAVITY);

    if (ball.x > W - BALL_R) { ball.x = W - BALL_R; ball.vx *= -0.3; }
    if (ball.x < BALL_R) { ball.x = BALL_R; ball.vx *= -0.3; }

    if (ball.y + BALL_R >= GROUND) {
      ball.y = GROUND - BALL_R;
      if (Math.abs(ball.vy) > 45) {
        ball.vy *= -0.42;           // bounce
        ball.vx *= 0.78;
      } else {
        ball.vy = 0;
        ball.onGround = true;
      }
    } else {
      ball.onGround = false;
    }

    if (ball.onGround) {
      ball.vx *= Math.exp(-1.15 * dt);   // rolling friction
      // Rolling slowly across the cup drops in, same as the real thing.
      if (Math.abs(ball.x - hole.x) < HOLE_R * 0.8 && Math.abs(ball.vx) < 300) return sink();
      if (Math.abs(ball.vx) < 9) {
        ball.vx = 0;
        state = "aim";                    // next stroke from where it lies
      }
    }
  }

  function sink() {
    state = "sunk";
    ball.vx = ball.vy = 0;
    ball.x = hole.x;
    sparkles = makeSparkles(hole.x, GROUND - 8, 55);
    const best = get("golf.best", null);
    if (best == null || strokes < best) set("golf.best", strokes);
    paintScore();
    sinkTimer = setTimeout(() => newHole(false), 2200);
  }

  function draw() {
    skyBands(ctx, W, H, ["#1b2a52", "#24365f", "#2d4270", "#3a5183"]);
    for (const c of clouds) cloud(ctx, c.x, c.y, c.s);

    // fairway
    px(ctx, 0, GROUND, W, H - GROUND, "#1f6b3a");
    px(ctx, 0, GROUND, W, 3, "#2f9152");
    for (let x = 6; x < W; x += 23) px(ctx, x, GROUND + 7 + ((x / 23) % 3) * 4, 3, 3, "#2f9152");

    drawHole();
    if (state === "aim" && !aim) startSpot(ctx, ball.x, ball.y, START_R * 0.55);
    drawBall();
    if (state === "aim" && aim) drawAim();
    if (state === "swing" || state === "aim") drawClub();
    drawSparkles(ctx, sparkles);

    if (state === "sunk") text(ctx, "IN THE HOLE!", W / 2, 74, 22, "#ffd23f", "center");
  }

  function drawHole() {
    px(ctx, hole.x - HOLE_R, GROUND, HOLE_R * 2, 6, "#0a0818");
    const poleX = Math.round(hole.x);
    px(ctx, poleX - 1, GROUND - 52, 3, 52, "#e8e4d8");
    // flag flutters faster the moment it goes in
    const wob = Math.sin(performance.now() / (state === "sunk" ? 55 : 220)) * (state === "sunk" ? 5 : 2);
    for (let i = 0; i < 5; i++) {
      px(ctx, poleX + 2, GROUND - 52 + i * 3 + wob * (i / 5), 22 - i * 3, 3, "#cd212a");
    }
  }

  function drawBall() {
    const x = Math.round(ball.x), y = Math.round(ball.y);
    px(ctx, x - BALL_R, y - BALL_R + 1, BALL_R * 2, BALL_R * 2 - 2, "#f5f0e6");
    px(ctx, x - BALL_R + 1, y - BALL_R, BALL_R * 2 - 2, BALL_R * 2, "#f5f0e6");
    px(ctx, x - 2, y - 2, 2, 2, "#ffffff");
  }

  function drawAim() {
    aimLine(ctx, ball, aim);
    trajectory(ctx, ball, launchVector(aim, MAX_SPEED), GRAVITY, GROUND);
    powerMeter(ctx, 16, H - 26, 130, 10, aim.power);
    text(ctx, "POWER", 16, H - 44, 8, "#f5f0e6");
  }

  function drawClub() {
    // Pull-back angle tracks power while aiming; the swing sweeps through it.
    const back = -2.35, through = 0.55;
    let a;
    if (state === "swing") a = back + (through - back) * easeOut(clamp(swing.t, 0, 1));
    else a = back + (aim ? -0.7 * aim.power : 0.35);

    const pivot = { x: ball.x - 14, y: GROUND - 66 };
    ctx.save();
    ctx.translate(pivot.x, pivot.y);
    ctx.rotate(a);
    px(ctx, -2, 0, 4, 62, "#cfd6e6");     // shaft
    px(ctx, -9, 58, 16, 8, "#e8eef7");    // head
    px(ctx, -9, 62, 16, 4, "#8d9bb5");
    ctx.restore();
    px(ctx, pivot.x - 4, pivot.y - 4, 9, 9, "#3a3370"); // grip
  }

  const easeOut = (t) => 1 - Math.pow(1 - t, 2.2);

  newHole(false);
  createLoop(update, draw).start();
}
