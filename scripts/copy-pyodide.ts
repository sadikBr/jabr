/**
 * Copies the Pyodide runtime from node_modules into public/pyodide/v<version>
 * so the app serves it from its own origin (same version as the npm package,
 * cacheable by the service worker, no third party needed to start Python).
 * Extra packages such as numpy and matplotlib load from the Pyodide CDN.
 * Runs on `postinstall`; the copy is git-ignored.
 */
import { cp, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const source = path.join(root, "node_modules/pyodide");
const { version } = JSON.parse(
  await readFile(path.join(source, "package.json"), "utf8"),
) as { version: string };
// The version is part of the path so a cached runtime is never mixed with
// files from another version after an upgrade.
const target = path.join(root, "public/pyodide", `v${version}`);

const files = [
  "pyodide.mjs",
  "pyodide.asm.mjs",
  "pyodide.asm.wasm",
  "python_stdlib.zip",
  "pyodide-lock.json",
];

await mkdir(target, { recursive: true });
await Promise.all(
  files.map((file) => cp(path.join(source, file), path.join(target, file))),
);
console.log(`Copied Pyodide ${version} runtime to public/pyodide/v${version}.`);
