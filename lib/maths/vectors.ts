/** Two-dimensional vectors, with angles in degrees measured anticlockwise from +x. */

export interface Vec {
  x: number;
  y: number;
}

export interface Polar {
  magnitude: number;
  /** Degrees anticlockwise from the positive x-axis. */
  angle: number;
}

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export function fromPolar({ magnitude, angle }: Polar): Vec {
  return {
    x: magnitude * Math.cos(toRadians(angle)),
    y: magnitude * Math.sin(toRadians(angle)),
  };
}

export function add(a: Vec, b: Vec): Vec {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function subtract(a: Vec, b: Vec): Vec {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(v: Vec, factor: number): Vec {
  return { x: v.x * factor, y: v.y * factor };
}

export function magnitude(v: Vec): number {
  return Math.hypot(v.x, v.y);
}

/** Direction in degrees, from 0 up to (not including) 360. Zero for the zero vector. */
export function angleOf(v: Vec): number {
  if (v.x === 0 && v.y === 0) return 0;
  const degrees = (Math.atan2(v.y, v.x) * 180) / Math.PI;
  return degrees < 0 ? degrees + 360 : degrees;
}

export function toPolar(v: Vec): Polar {
  return { magnitude: magnitude(v), angle: angleOf(v) };
}

/** The smallest angle between two directions, in degrees: 0 to 180. */
export function angleBetween(a: number, b: number): number {
  const difference = Math.abs(a - b) % 360;
  return difference > 180 ? 360 - difference : difference;
}
