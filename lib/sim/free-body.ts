import { add, fromPolar, type Vec } from "@/lib/maths/vectors";

/**
 * Situations for practising free-body diagrams. Each lists every force a
 * learner might think of: the ones really acting on the object, and the
 * tempting ones that are not. Sizes are in units of the object's weight.
 */

export const forceIds = [
  "weight",
  "normal",
  "tension",
  "friction",
  "drag",
  "thrust",
  // Not a real force: the belief that moving things need something pushing them.
  "motion",
] as const;
export type ForceId = (typeof forceIds)[number];

export interface ForceOnBody {
  /** True when this force really acts on the object here. */
  acts: boolean;
  /** Which way it points (or would), in degrees anticlockwise from +x. */
  angle: number;
  /** Its size as a multiple of the weight. */
  size: number;
}

export interface Situation {
  forces: Record<ForceId, ForceOnBody>;
  /** What the object rests on: nothing, level ground, or a slope of this many degrees. */
  surface: "none" | "level" | number;
  shape: "box" | "ball" | "rocket";
}

const absent = (angle: number): ForceOnBody => ({
  acts: false,
  angle,
  size: 0.7,
});
const acting = (angle: number, size = 1): ForceOnBody => ({
  acts: true,
  angle,
  size,
});

const RAMP = 30;
const cos = (degrees: number) => Math.cos((degrees * Math.PI) / 180);

export const situations = {
  /** A book lying on a table. */
  book: {
    shape: "box",
    surface: "level",
    forces: {
      weight: acting(270),
      normal: acting(90),
      tension: absent(90),
      friction: absent(180),
      drag: absent(90),
      thrust: absent(90),
      motion: absent(0),
    },
  },
  /** A ball dropped on the Moon, where there is no air. */
  ball: {
    shape: "ball",
    surface: "none",
    forces: {
      weight: acting(270),
      normal: absent(90),
      tension: absent(90),
      friction: absent(90),
      drag: absent(90),
      thrust: absent(270),
      motion: absent(270),
    },
  },
  /** A skydiver falling at a steady speed, before the parachute opens. */
  skydiver: {
    shape: "ball",
    surface: "none",
    forces: {
      weight: acting(270),
      normal: absent(90),
      tension: absent(90),
      friction: absent(0),
      drag: acting(90),
      thrust: absent(270),
      motion: absent(270),
    },
  },
  /** A sled pulled along smooth ice by a level rope. Friction and air are ignored. */
  sled: {
    shape: "box",
    surface: "level",
    forces: {
      weight: acting(270),
      normal: acting(90),
      tension: acting(0, 0.6),
      friction: absent(180),
      drag: absent(180),
      thrust: absent(0),
      motion: absent(0),
    },
  },
  /** A block sliding down a smooth ramp. Friction and air are ignored. */
  ramp: {
    shape: "box",
    surface: RAMP,
    forces: {
      weight: acting(270),
      // At right angles to the slope, and just big enough to stop the block sinking in.
      normal: acting(90 + RAMP, cos(RAMP)),
      tension: absent(RAMP),
      friction: absent(RAMP),
      drag: absent(RAMP),
      thrust: absent(180 + RAMP),
      motion: absent(180 + RAMP),
    },
  },
  /** A rocket just after lift-off, still slow enough to ignore the air. */
  rocket: {
    shape: "rocket",
    surface: "none",
    forces: {
      weight: acting(270),
      normal: absent(90),
      tension: absent(90),
      friction: absent(270),
      drag: absent(270),
      thrust: acting(90, 1.6),
      motion: absent(90),
    },
  },
} as const satisfies Record<string, Situation>;

export type SituationId = keyof typeof situations;
export const situationIds = Object.keys(situations) as [
  SituationId,
  ...SituationId[],
];

export function forceVector(force: ForceOnBody): Vec {
  return fromPolar({ magnitude: force.size, angle: force.angle });
}

/** The forces that really act, added together. */
export function netForce(situation: Situation): Vec {
  return forceIds
    .filter((id) => situation.forces[id].acts)
    .reduce<Vec>((sum, id) => add(sum, forceVector(situation.forces[id])), {
      x: 0,
      y: 0,
    });
}

/** Compares a learner's choice of forces with the ones that really act. */
export function checkDiagram(
  situation: Situation,
  chosen: readonly ForceId[],
): { correct: boolean; missing: ForceId[]; extra: ForceId[] } {
  const missing = forceIds.filter(
    (id) => situation.forces[id].acts && !chosen.includes(id),
  );
  const extra = forceIds.filter(
    (id) => !situation.forces[id].acts && chosen.includes(id),
  );
  return {
    correct: missing.length === 0 && extra.length === 0,
    missing,
    extra,
  };
}
