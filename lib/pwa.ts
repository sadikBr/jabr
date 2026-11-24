/**
 * iOS shows a launch image only when one matches the device exactly, so we
 * list the common portrait sizes. Used by app/layout.tsx (link tags) and
 * scripts/generate-icons.ts (the PNG files) so the two cannot drift.
 */
export const appleSplashDevices = [
  { width: 375, height: 667, ratio: 2 },
  { width: 414, height: 896, ratio: 2 },
  { width: 375, height: 812, ratio: 3 },
  { width: 390, height: 844, ratio: 3 },
  { width: 393, height: 852, ratio: 3 },
  { width: 402, height: 874, ratio: 3 },
  { width: 430, height: 932, ratio: 3 },
  { width: 440, height: 956, ratio: 3 },
  { width: 768, height: 1024, ratio: 2 },
  { width: 834, height: 1194, ratio: 2 },
  { width: 1024, height: 1366, ratio: 2 },
] as const;

export const splashSchemes = ["light", "dark"] as const;
export type SplashScheme = (typeof splashSchemes)[number];

export function splashFileName(
  device: (typeof appleSplashDevices)[number],
  scheme: SplashScheme,
): string {
  const w = device.width * device.ratio;
  const h = device.height * device.ratio;
  return `splash-${w}x${h}-${scheme}.png`;
}

export const appleStartupImages = appleSplashDevices.flatMap((device) =>
  splashSchemes.map((scheme) => ({
    url: `/splash/${splashFileName(device, scheme)}`,
    media: [
      `(device-width: ${device.width}px)`,
      `(device-height: ${device.height}px)`,
      `(-webkit-device-pixel-ratio: ${device.ratio})`,
      "(orientation: portrait)",
      `(prefers-color-scheme: ${scheme})`,
    ].join(" and "),
  })),
);
