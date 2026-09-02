// ========= shared mini-game engine: loop, pointer drag-aim, projectile step =========

/** Fixed-timestep simulation with rAF rendering, so physics never depends on framerate. */
export function createLoop(update, draw, { step = 1 / 120, maxCatchUp = 0.25 } = {}) {
  let last = 0, acc = 0, raf = 0, running = false;

  function frame(now) {
    if (!running) return;
    const t = now / 1000;
    if (!last) last = t;
    acc += Math.min(t - last, maxCatchUp);
    last = t;
    while (acc >= step) { update(step); acc -= step; }
    draw();
    raf = requestAnimationFrame(frame);
  }

  return {
    start() { if (!running) { running = true; last = 0; raf = requestAnimationFrame(frame); } },
    stop() { running = false; cancelAnimationFrame(raf); },
  };
}

/** Map a pointer event to the canvas's logical (unscaled) coordinate space. */
export function toLogical(canvas, evt) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((evt.clientX - r.left) / r.width) * canvas.width,
    y: ((evt.clientY - r.top) / r.height) * canvas.height,
  };
}

/**
 * Slingshot input, shared by golf and cornhole.
 * Press anywhere, drag BACK from the projectile, release to launch.
 * Pointer Events, so mouse and touch behave identically.
 */
export function attachDragAim(canvas, { getOrigin, maxPull = 160, enabled, onAim, onRelease }) {
  let dragging = false;

  const pull = (pt) => {
    const o = getOrigin();
    let dx = o.x - pt.x, dy = o.y - pt.y;
    const len = Math.hypot(dx, dy);
    if (len > maxPull) { dx = (dx / len) * maxPull; dy = (dy / len) * maxPull; }
    return { dx, dy, len: Math.min(len, maxPull), power: Math.min(len, maxPull) / maxPull };
  };

  canvas.addEventListener("pointerdown", (e) => {
    if (enabled && !enabled()) return;
    dragging = true;
    canvas.classList.add("dragging");
    // Capture keeps the drag alive past the canvas edge, which matters because a
    // big backswing goes outside it. Not every pointer id can be captured.
    try { canvas.setPointerCapture(e.pointerId); } catch { /* fine without it */ }
    onAim?.(pull(toLogical(canvas, e)));
    e.preventDefault();
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    onAim?.(pull(toLogical(canvas, e)));
  });

  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    canvas.classList.remove("dragging");
    onRelease?.(pull(toLogical(canvas, e)));
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
}

/**
 * Turn a pull into a launch velocity.
 *
 * A pure slingshot (fire exactly opposite the drag) doesn't work here: the ball
 * and the bag both sit ON the ground, so there is no room to drag downward and
 * every shot comes out flat. So the horizontal axis is a slingshot — drag left,
 * it goes right — while the vertical axis always launches UPWARD, proportional
 * to how far you dragged vertically in either direction. That makes the natural
 * gesture a backswing: drag back and up for a high shot, straight back for a
 * low runner.
 */
export function launchVector(pull, maxSpeed) {
  const dx = pull.dx;
  const dy = -Math.abs(pull.dy);
  const len = Math.hypot(dx, dy) || 1;
  const speed = pull.power * maxSpeed;
  return { vx: (dx / len) * speed, vy: (dy / len) * speed };
}

/** One projectile integration step. */
export function stepBody(b, dt, gravity) {
  b.vy += gravity * dt;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
}

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
