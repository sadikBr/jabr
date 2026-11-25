/**
 * Newton's cannonball: something fired horizontally from high above the
 * Earth, with no air. Too slow and it falls to the ground; fast enough and
 * it keeps missing the ground, which is an orbit; faster still and it
 * never comes back. Distances in km, speeds in km/s, times in s.
 */

export const EARTH_RADIUS = 6371;
/** The Earth's gravitational parameter, GM, in km³/s². */
export const MU = 398_600;

/** The speed of a circular orbit at this altitude. */
export function circularSpeed(altitude: number): number {
  return Math.sqrt(MU / (EARTH_RADIUS + altitude));
}

/** The least speed that never comes back, at this altitude. */
export function escapeSpeed(altitude: number): number {
  return Math.SQRT2 * circularSpeed(altitude);
}

/** The time for one lap of an orbit whose long axis is 2 × `semiMajorAxis`. */
export function orbitalPeriod(semiMajorAxis: number): number {
  return 2 * Math.PI * Math.sqrt(semiMajorAxis ** 3 / MU);
}

export type Outcome =
  /** It came down, `groundDistance` km round the Earth from the launch. */
  | { kind: "crash"; groundDistance: number; time: number }
  /** A closed orbit, between these two altitudes. */
  | { kind: "orbit"; lowest: number; highest: number; period: number }
  | { kind: "escape" };

export interface Flight {
  /** The path, with the Earth's centre at the origin and the launch at the top. */
  points: { x: number; y: number; t: number }[];
  outcome: Outcome;
}

/** How far out an escaping path is followed, in Earth radii. */
const FOLLOW_TO = 9;
const POINTS = 360;

/**
 * Fires a projectile horizontally at `speed` from `altitude` above the
 * surface and follows it until it lands, completes one lap, or leaves.
 */
export function fly(speed: number, altitude: number): Flight {
  const r0 = EARTH_RADIUS + altitude;
  // The kind of path follows from its energy; no need to simulate to find out.
  const energy = (speed * speed) / 2 - MU / r0;
  const semiMajorAxis = energy < 0 ? -MU / (2 * energy) : Infinity;
  const otherEnd = 2 * semiMajorAxis - r0;
  const escapes = energy >= 0;

  // Follow the path step by step (velocity Verlet, which keeps orbits closed).
  const span = escapes ? 40_000 : orbitalPeriod(semiMajorAxis);
  const steps = 20_000;
  const dt = span / steps;
  const every = Math.ceil(steps / POINTS);
  const pull = (x: number, y: number) => {
    const r = Math.hypot(x, y);
    const strength = -MU / (r * r * r);
    return [strength * x, strength * y] as const;
  };

  let x = 0;
  let y = r0;
  let vx = speed;
  let vy = 0;
  let [ax, ay] = pull(x, y);
  let swept = 0;
  let time = 0;
  const points = [{ x, y, t: 0 }];
  let landed: { angle: number; time: number } | null = null;

  for (let step = 1; step <= steps; step++) {
    const beforeAngle = Math.atan2(x, y);
    x += vx * dt + 0.5 * ax * dt * dt;
    y += vy * dt + 0.5 * ay * dt * dt;
    const [nextAx, nextAy] = pull(x, y);
    vx += 0.5 * (ax + nextAx) * dt;
    vy += 0.5 * (ay + nextAy) * dt;
    [ax, ay] = [nextAx, nextAy];
    time += dt;

    // The angle travelled round the Earth so far, clockwise from the top.
    let turned = Math.atan2(x, y) - beforeAngle;
    if (turned < -Math.PI) turned += 2 * Math.PI;
    swept += turned;

    const r = Math.hypot(x, y);
    if (r <= EARTH_RADIUS) {
      // Put the last point on the surface itself.
      const scale = EARTH_RADIUS / r;
      x *= scale;
      y *= scale;
      landed = { angle: swept, time };
      points.push({ x, y, t: time });
      break;
    }
    const last = step === steps || swept >= 2 * Math.PI;
    if (step % every === 0 || last) points.push({ x, y, t: time });
    if (last || r > FOLLOW_TO * EARTH_RADIUS) break;
  }

  let outcome: Outcome;
  if (escapes) {
    outcome = { kind: "escape" };
  } else if (landed) {
    outcome = {
      kind: "crash",
      groundDistance: landed.angle * EARTH_RADIUS,
      time: landed.time,
    };
  } else {
    outcome = {
      kind: "orbit",
      lowest: Math.min(r0, otherEnd) - EARTH_RADIUS,
      highest: Math.max(r0, otherEnd) - EARTH_RADIUS,
      period: orbitalPeriod(semiMajorAxis),
    };
  }
  return { points, outcome };
}
