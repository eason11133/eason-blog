/** One-off meteor hit testing; no DOM reads during flight. */
export interface SkyPoint { x: number; y: number }
export interface SkyRect { left: number; top: number; right: number; bottom: number }

/** Distance until the entire meteor (including its tail) clears the screen. */
export function meteorExitDistance(
  origin: SkyPoint, direction: SkyPoint, trailLength: number,
  width: number, height: number,
): number {
  const margin = 26;
  const tailX = Math.abs(direction.x) * trailLength;
  const tailY = direction.y * trailLength;
  const side = direction.x < 0
    ? (origin.x + tailX + margin) / Math.max(.01, -direction.x)
    : (width - origin.x + tailX + margin) / Math.max(.01, direction.x);
  const bottom = (height - origin.y + tailY + margin) / Math.max(.01, direction.y);
  return Math.max(30, Math.min(side, bottom));
}

/** First crossing of a screen-space title/tag rectangle, or null. */
export function firstMeteorCollision(
  start: SkyPoint, end: SkyPoint,
  rectangles: readonly SkyRect[], minFraction = .035,
): number | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  let first = Infinity;
  for (const rect of rectangles) {
    const left = rect.left - 3, right = rect.right + 3;
    const top = rect.top - 3, bottom = rect.bottom + 3;
    if (start.x >= left && start.x <= right &&
        start.y >= top && start.y <= bottom) continue;
    let near = 0, far = 1;
    if (Math.abs(dx) < 1e-8) {
      if (start.x < left || start.x > right) continue;
    } else {
      const a = (left - start.x) / dx, b = (right - start.x) / dx;
      near = Math.max(near, Math.min(a, b));
      far = Math.min(far, Math.max(a, b));
    }
    if (Math.abs(dy) < 1e-8) {
      if (start.y < top || start.y > bottom) continue;
    } else {
      const a = (top - start.y) / dy, b = (bottom - start.y) / dy;
      near = Math.max(near, Math.min(a, b));
      far = Math.min(far, Math.max(a, b));
    }
    if (near <= far && near >= minFraction &&
        near < first && near <= 1) first = near;
  }
  return Number.isFinite(first) ? first : null;
}
