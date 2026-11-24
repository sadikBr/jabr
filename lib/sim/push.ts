/**
 * A block pushed along a level surface with a steady force for a while, and
 * then let go. Newton's second law gives its acceleration during the push;
 * afterwards it coasts, or slows down if there is friction.
 */

export const G = 9.81;

export interface Push {
  /** Mass of the block, in kg. */
  mass: number;
  /** The pushing force, in N. */
  force: number;
  /** How long the push lasts, in s. */
  duration: number;
  /** Coefficient of sliding friction. Zero means ice-like: none at all. */
  friction?: number;
}

/** The friction force while sliding, in N. */
export function frictionForce({ mass, friction = 0 }: Push): number {
  return friction * mass * G;
}

/**
 * Acceleration during the push: net force over mass. A push too weak to
 * beat friction does not move the block at all.
 */
export function pushAcceleration(push: Push): number {
  return Math.max(0, (push.force - frictionForce(push)) / push.mass);
}

/** Acceleration once the push ends: zero without friction, negative with it. */
export function coastAcceleration({ friction = 0 }: Push): number {
  return friction === 0 ? 0 : -friction * G;
}

/** The speed when the push ends. */
export function releaseSpeed(push: Push): number {
  return pushAcceleration(push) * push.duration;
}

export function speedAt(push: Push, t: number): number {
  if (t <= push.duration) return pushAcceleration(push) * t;
  return Math.max(
    0,
    releaseSpeed(push) + coastAcceleration(push) * (t - push.duration),
  );
}

export function distanceAt(push: Push, t: number): number {
  const a = pushAcceleration(push);
  if (t <= push.duration) return 0.5 * a * t * t;
  const pushed = 0.5 * a * push.duration * push.duration;
  const v = releaseSpeed(push);
  const slowing = coastAcceleration(push);
  let coasting = t - push.duration;
  // With friction the block stops, and stays stopped.
  if (slowing < 0) coasting = Math.min(coasting, v / -slowing);
  return pushed + v * coasting + 0.5 * slowing * coasting * coasting;
}
