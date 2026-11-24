/**
 * Generates every raster brand asset from the mark in lib/brand.ts:
 * favicon, app icons, maskable icon, Apple touch icon and iOS launch images.
 * Run with `bun run icons` after changing the mark or the theme colours.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { brandMark } from "../lib/brand";
import {
  appleSplashDevices,
  splashFileName,
  splashSchemes,
  type SplashScheme,
} from "../lib/pwa";
import { site } from "../lib/site";

const root = path.resolve(import.meta.dirname, "..");
const { stem, stemWidth, dot, colors } = brandMark;

const gradient = `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${colors.backgroundFrom}"/><stop offset="1" stop-color="${colors.backgroundTo}"/></linearGradient></defs>`;
const glyph = `<path d="${stem}" fill="none" stroke="${colors.stem}" stroke-width="${stemWidth}" stroke-linecap="round"/><circle cx="${dot.cx}" cy="${dot.cy}" r="${dot.r}" fill="${colors.dot}"/>`;

/** The mark on its gradient tile. `radius` 0 gives a full-bleed square. */
function tileSvg(radius: number, glyphScale = 1): string {
  const offset = (512 * (1 - glyphScale)) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${brandMark.viewBox}">${gradient}<rect width="512" height="512" rx="${radius}" fill="url(#bg)"/><g transform="translate(${offset} ${offset}) scale(${glyphScale})">${glyph}</g></svg>`;
}

function splashSvg(width: number, height: number, scheme: SplashScheme) {
  const size = Math.round(Math.min(width, height) * 0.28);
  const x = Math.round((width - size) / 2);
  const y = Math.round((height - size) / 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${site.themeColor[scheme]}"/><svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="${brandMark.viewBox}">${gradient}<rect width="512" height="512" rx="120" fill="url(#bg)"/>${glyph}</svg></svg>`;
}

async function png(svg: string, size: number): Promise<Buffer> {
  return sharp(Buffer.from(svg), { density: 300 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Wraps PNG images in an ICO container (PNG-in-ICO, supported everywhere). */
function ico(images: { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size, 0);
    entry.writeUInt8(size, 1);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

async function write(file: string, data: Buffer | string): Promise<void> {
  const target = path.join(root, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, data);
  console.log(`wrote ${file}`);
}

const rounded = tileSvg(120);
const square = tileSvg(0);

await write("app/icon.svg", rounded);
await write(
  "app/favicon.ico",
  ico(
    await Promise.all(
      [16, 32, 48].map(async (size) => ({
        size,
        data: await png(rounded, size),
      })),
    ),
  ),
);
// iOS and maskable icons are cropped by the OS, so they are full-bleed.
await write("app/apple-icon.png", await png(square, 180));
await write("public/icons/icon-192.png", await png(rounded, 192));
await write("public/icons/icon-512.png", await png(rounded, 512));
await write("public/icons/maskable-512.png", await png(tileSvg(0, 0.72), 512));

for (const device of appleSplashDevices) {
  for (const scheme of splashSchemes) {
    const width = device.width * device.ratio;
    const height = device.height * device.ratio;
    const data = await sharp(Buffer.from(splashSvg(width, height, scheme)))
      .png({ compressionLevel: 9, palette: true })
      .toBuffer();
    await write(`public/splash/${splashFileName(device, scheme)}`, data);
  }
}
