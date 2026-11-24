/**
 * Validates everything under /content. Run with `bun run content:check`
 * (which builds the content first). Exits non-zero on any error.
 *
 *   --update-ids   record the current ids in content/ids.lock.json
 *   --strict       treat warnings as errors
 */
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ContentBundle } from "../lib/content/types";
import {
  collectIds,
  type IdLock,
  type Issue,
  validateContent,
} from "../lib/content/validate";

const root = path.resolve(import.meta.dirname, "..");
const lockPath = path.join(root, "content/ids.lock.json");
const args = new Set(process.argv.slice(2));

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8")) as T;
}

async function loadContent(): Promise<ContentBundle> {
  const load = <K extends keyof ContentBundle>(name: K) =>
    readJson<ContentBundle[K]>(path.join(root, ".velite", `${name}.json`));
  return {
    concepts: await load("concepts"),
    courses: await load("courses"),
    lessons: await load("lessons"),
    explainers: await load("explainers"),
    projects: await load("projects"),
    milestones: await load("milestones"),
    questions: await load("questions"),
  };
}

function print(issues: Issue[], label: string): void {
  if (issues.length === 0) return;
  console.log(`\n${label} (${issues.length})`);
  for (const issue of issues) {
    console.log(`  [${issue.code}] ${issue.source}\n      ${issue.message}`);
  }
}

const content = await loadContent();
const lock = existsSync(lockPath)
  ? await readJson<IdLock>(lockPath)
  : undefined;
const issues = validateContent(content, lock);
const errors = issues.filter((issue) => issue.level === "error");
const warnings = issues.filter((issue) => issue.level === "warning");

print(errors, "Errors");
print(warnings, "Warnings");

const counts = Object.entries(collectIds(content))
  .map(([kind, ids]) => `${ids.length} ${kind}`)
  .join(", ");
console.log(`\nChecked ${counts}.`);

const failed =
  errors.length > 0 || (args.has("--strict") && warnings.length > 0);
if (failed) {
  console.log("Content check failed.");
  process.exit(1);
}

if (args.has("--update-ids") || !lock) {
  await writeFile(
    lockPath,
    `${JSON.stringify(collectIds(content), null, 2)}\n`,
  );
  console.log("Recorded ids in content/ids.lock.json.");
}
console.log(
  warnings.length > 0
    ? `Content check passed with ${warnings.length} warning(s).`
    : "Content check passed.",
);
