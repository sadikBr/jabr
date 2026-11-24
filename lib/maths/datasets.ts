/**
 * Measured data the interactives can plot: readings of one quantity against
 * another, in order.
 */

export interface Dataset {
  /** Units of the horizontal and vertical quantities. */
  units: { x: string; y: string };
  points: readonly { x: number; y: number }[];
}

export const datasets = {
  /**
   * Usain Bolt's 100 m world record (9.58 s, Berlin, 2009): the time at which
   * he passed each 10 m mark, from the IAAF's biomechanical analysis of the
   * race. Times include his 0.146 s reaction to the gun.
   */
  sprint: {
    units: { x: "s", y: "m" },
    points: [
      { x: 0, y: 0 },
      { x: 1.89, y: 10 },
      { x: 2.88, y: 20 },
      { x: 3.78, y: 30 },
      { x: 4.64, y: 40 },
      { x: 5.47, y: 50 },
      { x: 6.29, y: 60 },
      { x: 7.1, y: 70 },
      { x: 7.92, y: 80 },
      { x: 8.75, y: 90 },
      { x: 9.58, y: 100 },
    ],
  },
} as const satisfies Record<string, Dataset>;

export type DatasetId = keyof typeof datasets;
export const datasetIds = Object.keys(datasets) as [DatasetId, ...DatasetId[]];

/** Average rate of change between two points: rise over run. */
export function slopeBetween(
  from: { x: number; y: number },
  to: { x: number; y: number },
): number {
  return (to.y - from.y) / (to.x - from.x);
}
