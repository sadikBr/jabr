/**
 * Projectile motion on flat ground, with optional quadratic air drag.
 * Units are SI throughout: metres, seconds, metres per second.
 */

export interface ProjectileInput {
  /** Launch speed in m/s. */
  speed: number;
  /** Launch angle above the horizontal, in degrees. */
  angle: number;
  /** Gravitational acceleration in m/s². */
  gravity: number;
  /**
   * Drag constant divided by mass, k/m, in 1/m. Drag deceleration is
   * (k/m)·v². Zero means no air.
   */
  drag?: number;
}

export interface TrajectoryPoint {
  t: number;
  x: number;
  y: number;
}

export interface Trajectory {
  points: TrajectoryPoint[];
  /** Horizontal distance where it lands, in metres. */
  range: number;
  flightTime: number;
  maxHeight: number;
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Exact range without air: v² sin(2θ) / g. */
export function idealRange(speed: number, angle: number, gravity: number) {
  return (speed * speed * Math.sin(2 * toRadians(angle))) / gravity;
}

/** Exact flight time without air: 2 v sin(θ) / g. */
export function idealFlightTime(speed: number, angle: number, gravity: number) {
  return (2 * speed * Math.sin(toRadians(angle))) / gravity;
}

/**
 * The flight path. Without drag it is sampled from the exact formulas. With
 * drag there is no formula, so it is stepped forward in small time steps
 * (midpoint method), ending exactly where it crosses the ground.
 */
export function simulateProjectile(
  input: ProjectileInput,
  samples = 80,
): Trajectory {
  const { speed, angle, gravity } = input;
  const drag = input.drag ?? 0;
  const vx0 = speed * Math.cos(toRadians(angle));
  const vy0 = speed * Math.sin(toRadians(angle));

  if (drag === 0) {
    const flightTime = idealFlightTime(speed, angle, gravity);
    const points = Array.from({ length: samples + 1 }, (_, i) => {
      const t = (flightTime * i) / samples;
      return {
        t,
        x: vx0 * t,
        y: Math.max(0, vy0 * t - 0.5 * gravity * t * t),
      };
    });
    return {
      points,
      range: idealRange(speed, angle, gravity),
      flightTime,
      maxHeight: (vy0 * vy0) / (2 * gravity),
    };
  }

  const acceleration = (vx: number, vy: number) => {
    const v = Math.hypot(vx, vy);
    return { ax: -drag * v * vx, ay: -gravity - drag * v * vy };
  };

  // Small enough that halving it changes the range by well under 0.1%.
  const dt = Math.max(idealFlightTime(speed, angle, gravity), 0.01) / 2000;
  const all: TrajectoryPoint[] = [{ t: 0, x: 0, y: 0 }];
  let [t, x, y, vx, vy] = [0, 0, 0, vx0, vy0];
  let maxHeight = 0;

  for (let step = 0; step < 200_000; step++) {
    const a1 = acceleration(vx, vy);
    const midVx = vx + (a1.ax * dt) / 2;
    const midVy = vy + (a1.ay * dt) / 2;
    const a2 = acceleration(midVx, midVy);
    const nextX = x + midVx * dt;
    const nextY = y + midVy * dt;

    if (nextY < 0) {
      // Land exactly on the ground, part-way through this step.
      const fraction = y / (y - nextY);
      t += dt * fraction;
      x += (nextX - x) * fraction;
      y = 0;
      all.push({ t, x, y });
      break;
    }
    [t, x, y] = [t + dt, nextX, nextY];
    [vx, vy] = [vx + a2.ax * dt, vy + a2.ay * dt];
    maxHeight = Math.max(maxHeight, y);
    all.push({ t, x, y });
  }

  // Thin the path out evenly for drawing, keeping the first and last points.
  const stride = Math.max(1, Math.floor(all.length / samples));
  const points = all.filter(
    (_, index) => index % stride === 0 || index === all.length - 1,
  );
  return { points, range: x, flightTime: t, maxHeight };
}

/** Where the projectile is at time t, by interpolating along its path. */
export function positionAt(trajectory: Trajectory, t: number): TrajectoryPoint {
  const { points } = trajectory;
  const last = points[points.length - 1]!;
  if (t >= last.t) return last;
  const index = points.findIndex((point) => point.t > t);
  const after = points[Math.max(index, 1)]!;
  const before = points[Math.max(index, 1) - 1]!;
  const fraction = (t - before.t) / (after.t - before.t || 1);
  return {
    t,
    x: before.x + (after.x - before.x) * fraction,
    y: before.y + (after.y - before.y) * fraction,
  };
}
