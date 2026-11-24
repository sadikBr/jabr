/**
 * A ball thrown straight up from the ground, with no air: height, velocity
 * and acceleration as functions of time. Each is the derivative of the one
 * before.
 */

export const G = 9.81; // m/s²

export interface Throw {
  /** Launch speed, in m/s, upward. */
  speed: number;
  gravity?: number;
}

export function height({ speed, gravity = G }: Throw, t: number): number {
  return speed * t - 0.5 * gravity * t * t;
}

export function velocity({ speed, gravity = G }: Throw, t: number): number {
  return speed - gravity * t;
}

export function acceleration({ gravity = G }: Throw): number {
  return -gravity;
}

/** When the ball stops rising: the moment its velocity is zero. */
export function peakTime({ speed, gravity = G }: Throw): number {
  return speed / gravity;
}

export function peakHeight(thrown: Throw): number {
  return height(thrown, peakTime(thrown));
}

/** When it lands back where it started. */
export function flightTime(thrown: Throw): number {
  return 2 * peakTime(thrown);
}
