/**
 * A car stopping in an emergency. For the driver's reaction time it carries
 * on at full speed (the thinking distance); then it brakes at a constant
 * rate until it stops (the braking distance). SI units throughout.
 */

export interface Stop {
  /** Speed before braking, in m/s. */
  speed: number;
  /** Time before the brakes go on, in s. */
  reaction: number;
  /** How hard the brakes slow the car, in m/s² (a positive number). */
  deceleration: number;
}

export const kmhToMs = (kmh: number) => kmh / 3.6;
export const msToKmh = (ms: number) => ms * 3.6;

export function thinkingDistance({ speed, reaction }: Stop): number {
  return speed * reaction;
}

/** From v² = u² + 2as with v = 0: the distance grows with the square of the speed. */
export function brakingDistance({ speed, deceleration }: Stop): number {
  return (speed * speed) / (2 * deceleration);
}

export function stoppingDistance(stop: Stop): number {
  return thinkingDistance(stop) + brakingDistance(stop);
}

export function stoppingTime({ speed, reaction, deceleration }: Stop): number {
  return reaction + speed / deceleration;
}

/** The car's speed t seconds after the driver sees the danger. */
export function speedAt(stop: Stop, t: number): number {
  if (t <= stop.reaction) return stop.speed;
  return Math.max(0, stop.speed - stop.deceleration * (t - stop.reaction));
}

/** How far the car has gone t seconds after the driver sees the danger. */
export function distanceAt(stop: Stop, t: number): number {
  if (t <= stop.reaction) return stop.speed * t;
  const braking = Math.min(t, stoppingTime(stop)) - stop.reaction;
  return (
    thinkingDistance(stop) +
    stop.speed * braking -
    0.5 * stop.deceleration * braking * braking
  );
}

/**
 * What happens with an obstacle `distance` metres ahead: the car either
 * stops short, or reaches it at some speed after some time.
 */
export function outcome(
  stop: Stop,
  distance: number,
):
  | { stopped: true; margin: number }
  | { stopped: false; impactSpeed: number; time: number } {
  const needed = stoppingDistance(stop);
  if (needed <= distance) return { stopped: true, margin: distance - needed };
  const thinking = thinkingDistance(stop);
  if (distance <= thinking) {
    return {
      stopped: false,
      impactSpeed: stop.speed,
      time: distance / stop.speed,
    };
  }
  // v² = u² − 2a·(distance covered while braking)
  const impactSpeed = Math.sqrt(
    stop.speed * stop.speed - 2 * stop.deceleration * (distance - thinking),
  );
  return {
    stopped: false,
    impactSpeed,
    time: stop.reaction + (stop.speed - impactSpeed) / stop.deceleration,
  };
}
