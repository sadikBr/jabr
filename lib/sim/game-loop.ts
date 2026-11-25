/**
 * A ball bouncing on a platform, simulated the way a simple game does it:
 * once per frame, nudge the velocity and the position forwards, then check
 * whether the ball is touching the platform. At a low frame rate the ball
 * moves further in one frame than the platform is thick, and can skip
 * straight through it. Checking the path between frames ("sweeping") cures
 * that. SI units.
 */

export const G = 9.8;

export interface World {
  /** Where the ball is dropped from, above the top of the platform, in m. */
  dropHeight: number;
  /** How thick the platform is, in m. */
  thickness: number;
  /** The share of its speed the ball keeps after a bounce. */
  bounciness: number;
  /** How long to simulate, in s. */
  duration: number;
}

export const defaultWorld: World = {
  dropHeight: 5,
  thickness: 0.2,
  bounciness: 0.8,
  duration: 5,
};

export interface Frame {
  t: number;
  /** Height above the top of the platform. Negative means below it. */
  y: number;
  v: number;
}

export interface LoopRun {
  frames: Frame[];
  bounces: number;
  /** When the ball passed through the platform, if it did. */
  fellThroughAt: number | null;
}

/** The ball is followed this far below the platform before the run ends. */
const LOST_BELOW = 4;

export function runLoop(
  fps: number,
  /** Check the path between frames, not just where the ball ends up. */
  sweep: boolean,
  world: World = defaultWorld,
): LoopRun {
  const dt = 1 / fps;
  let y = world.dropHeight;
  let v = 0;
  let bounces = 0;
  let fellThroughAt: number | null = null;
  const frames: Frame[] = [{ t: 0, y, v }];

  for (let frame = 1; frame <= Math.round(world.duration * fps); frame++) {
    const before = y;
    v -= G * dt;
    y += v * dt;

    const falling = v < 0;
    const inside = y <= 0 && y >= -world.thickness;
    const crossed = before > 0 && y <= 0;
    if (falling && fellThroughAt === null && (sweep ? crossed : inside)) {
      y = 0;
      v = -v * world.bounciness;
      bounces++;
    } else if (fellThroughAt === null && before > 0 && y < -world.thickness) {
      // Above the platform in one frame, below it in the next.
      fellThroughAt = frame * dt;
    }

    frames.push({ t: frame * dt, y, v });
    if (y < -LOST_BELOW) break;
  }
  return { frames, bounces, fellThroughAt };
}

/** The height the ball really has at time t on its first fall, for comparison. */
export function trueFall(world: World, t: number): number {
  return world.dropHeight - 0.5 * G * t * t;
}
