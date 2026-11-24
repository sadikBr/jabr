/**
 * Geometry of the Jabr mark on a 512×512 canvas: a lowercase "j" whose dot is
 * a node — one idea, connected. Shared by the React logo and the icon generator.
 */
export const brandMark = {
  viewBox: "0 0 512 512",
  stem: "M300 222 V318 C300 374 262 406 196 406",
  stemWidth: 60,
  dot: { cx: 300, cy: 124, r: 40 },
  colors: {
    backgroundFrom: "#5b50e6",
    backgroundTo: "#2e2a8f",
    stem: "#ffffff",
    dot: "#f5b544",
  },
} as const;
