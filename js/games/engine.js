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
 * Aim input, shared by golf and cornhole.
 *
 * The drag has to START on the projectile — the games mark that spot with a
 * ring — and from there the shot simply follows the mouse: drag up and right,
 * it leaves up and right. Power is how far you dragged.
 *
 * The one clamp: the ball and the bag both sit ON the ground, so a downward
 * drag has nowhere to send them. Dragging below the projectile is flattened to
 * level, which keeps the aim line, the arc preview and the launch all agreeing.
 *
 * Pointer Events, so mouse and touch behave identically.
 */
export function attachDragAim(canvas, {
  getOrigin, maxPull = 160, startRadius = 46, enabled, onAim, onRelease, onMissedStart,
}) {
  let dragging = false;

  const aimAt = (pt) => {
    const o = getOrigin();
    let dx = pt.x - o.x, dy = Math.min(pt.y - o.y, 0);
    const len = Math.hypot(dx, dy);
    if (len > maxPull) { dx = (dx / len) * maxPull; dy = (dy / len) * maxPull; }
    return { dx, dy, len: Math.min(len, maxPull), power: Math.min(len, maxPull) / maxPull };
  };

  canvas.addEventListener("pointerdown", (e) => {
    if (enabled && !enabled()) return;
    const pt = toLogical(canvas, e);
    const o = getOrigin();
    if (Math.hypot(pt.x - o.x, pt.y - o.y) > startRadius) { onMissedStart?.(); return; }
    dragging = true;
    canvas.classList.add("dragging");
    // Capture keeps the drag alive past the canvas edge, which matters because a
    // long pull goes outside it. Not every pointer id can be captured.
    try { canvas.setPointerCapture(e.pointerId); } catch { /* fine without it */ }
    onAim?.(aimAt(pt));
    e.preventDefault();
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    onAim?.(aimAt(toLogical(canvas, e)));
  });

  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    canvas.classList.remove("dragging");
    onRelease?.(aimAt(toLogical(canvas, e)));
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
}

/**
 * Turn an aim into a launch velocity: straight down the direction you dragged,
 * at a speed set by how far you dragged.
 */
export function launchVector(aim, maxSpeed) {
  const len = Math.hypot(aim.dx, aim.dy) || 1;
  const speed = aim.power * maxSpeed;
  return { vx: (aim.dx / len) * speed, vy: (aim.dy / len) * speed };
}

/** One projectile integration step. */
export function stepBody(b, dt, gravity) {
  b.vy += gravity * dt;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
}

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
