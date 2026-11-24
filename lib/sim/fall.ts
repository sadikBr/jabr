/**
 * An object dropped from rest, with optional quadratic air drag:
 *   m·a = m·g − k·v²
 * Both cases have exact solutions, so nothing here is approximate.
 */

export interface FallingBody {
  /** Mass in kg. */
  mass: number;
  /** Drag constant k = ½ρ·C_d·A in kg/m. Zero means no air. */
  drag: number;
}

/** Speed at which drag balances weight. Infinite when there is no drag. */
export function terminalVelocity(body: FallingBody, gravity: number): number {
  return body.drag === 0
    ? Number.POSITIVE_INFINITY
    : Math.sqrt((body.mass * gravity) / body.drag);
}

/** Distance fallen after t seconds. */
export function distanceFallen(
  body: FallingBody,
  gravity: number,
  t: number,
): number {
  if (body.drag === 0) return 0.5 * gravity * t * t;
  const vt = terminalVelocity(body, gravity);
  // y(t) = (v_t² / g) · ln cosh(g t / v_t), written to stay finite for large t.
  const u = (gravity * t) / vt;
  const lnCosh = u + Math.log1p(Math.exp(-2 * u)) - Math.LN2;
  return ((vt * vt) / gravity) * lnCosh;
}

/** Speed after t seconds. */
export function speedAfter(
  body: FallingBody,
  gravity: number,
  t: number,
): number {
  if (body.drag === 0) return gravity * t;
  const vt = terminalVelocity(body, gravity);
  return vt * Math.tanh((gravity * t) / vt);
}

/** Seconds to fall a given height from rest. */
export function fallTime(
  body: FallingBody,
  gravity: number,
  height: number,
): number {
  if (body.drag === 0) return Math.sqrt((2 * height) / gravity);
  const vt = terminalVelocity(body, gravity);
  // Invert y(t): t = (v_t / g) · acosh(exp(g·h / v_t²)).
  return (vt / gravity) * Math.acosh(Math.exp((gravity * height) / (vt * vt)));
}
