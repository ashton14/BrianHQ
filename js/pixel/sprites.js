// ========= canvas drawing helpers, all crisp integer rectangles =========

export function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function skyBands(ctx, W, H, bands) {
  const h = Math.ceil(H / bands.length);
  bands.forEach((c, i) => px(ctx, 0, i * h, W, h, c));
}

export function cloud(ctx, x, y, s, color = "rgba(255,255,255,.16)") {
  px(ctx, x, y, 22 * s, 6 * s, color);
  px(ctx, x + 5 * s, y - 5 * s, 12 * s, 6 * s, color);
  px(ctx, x + 14 * s, y - 3 * s, 9 * s, 4 * s, color);
}

/** Dotted aim preview: where the shot would actually land, simulated forward. */
export function trajectory(ctx, start, vel, gravity, groundY, color = "rgba(255,255,255,.55)") {
  let x = start.x, y = start.y, vx = vel.vx, vy = vel.vy;
  const dt = 1 / 60;
  for (let i = 0; i < 90; i++) {
    vy += gravity * dt;
    x += vx * dt;
    y += vy * dt;
    if (y > groundY || x > 4000) break;
    if (i % 4 === 0) px(ctx, x - 1, y - 1, 3, 3, color);
  }
}

/** The ring that marks where a drag has to start. Slowly spins so it reads as live. */
export function startSpot(ctx, x, y, r, color = "#ffd23f") {
  const t = performance.now() / 1000;
  const rr = r + Math.sin(t * 3) * 2;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + t;
    px(ctx, x + Math.cos(a) * rr - 1, y + Math.sin(a) * rr - 1, 3, 3, color);
  }
}

/** The drag itself: a dotted line from the projectile to the cursor, tipped with a target. */
export function aimLine(ctx, from, aim, color = "#ffd23f") {
  const steps = Math.max(1, Math.round(aim.len / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    px(ctx, from.x + aim.dx * t - 1, from.y + aim.dy * t - 1, 3, 3, color);
  }
  const tx = from.x + aim.dx, ty = from.y + aim.dy;
  px(ctx, tx - 6, ty - 1, 13, 3, color);
  px(ctx, tx - 1, ty - 6, 3, 13, color);
}

export function powerMeter(ctx, x, y, w, h, power) {
  px(ctx, x - 2, y - 2, w + 4, h + 4, "#0a0818");
  px(ctx, x, y, w, h, "#1e1b3a");
  const c = power > 0.85 ? "#ff5c57" : power > 0.55 ? "#ffd23f" : "#3ddc84";
  px(ctx, x, y, Math.round(w * power), h, c);
}

export function text(ctx, str, x, y, size, color, align = "left") {
  ctx.font = `${size}px "Press Start 2P", monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(0,0,0,.7)";
  ctx.fillText(str, x + 2, y + 2);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

/** Chunky sparkle burst reused by both games' celebrations. */
export function makeSparkles(x, y, n = 40) {
  const colors = ["#ffd23f", "#3ddc84", "#f5f0e6", "#4ad6ff"];
  return Array.from({ length: n }, () => ({
    x, y,
    vx: (Math.random() - 0.5) * 380,
    vy: -120 - Math.random() * 300,
    life: 0.9 + Math.random() * 0.5,
    s: 3 + Math.floor(Math.random() * 3) * 2,
    c: colors[(Math.random() * colors.length) | 0],
  }));
}

export function stepSparkles(list, dt, gravity = 800) {
  for (const p of list) {
    p.vy += gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  return list.filter((p) => p.life > 0);
}

export function drawSparkles(ctx, list) {
  for (const p of list) px(ctx, p.x, p.y, p.s, p.s, p.c);
}
