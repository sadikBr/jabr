/**
 * Runs every code question with the system Python, using the same harness as
 * the browser, and checks that:
 *   - a playground's starter code runs without an error;
 *   - a graded lab's starter does NOT already pass its tests;
 *   - its reference solution (tests/fixtures/solutions/<id>.py) passes them all.
 *
 * Needs python3 with numpy and matplotlib. Run with `bun run content:verify-code`
 * after `bun run content:build`.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { PYTHON_HARNESS, type RunOutcome } from "../lib/codelab/harness";
import type { Question } from "../lib/content/types";

const root = path.resolve(import.meta.dirname, "..");

const DRIVER = `
import json, os, sys
os.environ["MPLBACKEND"] = "Agg"
${PYTHON_HARNESS}
job = json.load(sys.stdin)
real_stdout = sys.stdout
sys.stdout = sys.stderr  # the program's own prints must not mix with the result
result = __jabr_run(job["code"], job.get("tests"))
real_stdout.write(result)
`;

function run(code: string, tests?: string): RunOutcome {
  const child = spawnSync("python3", ["-c", DRIVER], {
    input: JSON.stringify({ code, tests: tests ?? null }),
    encoding: "utf8",
    timeout: 60_000,
  });
  if (child.status !== 0) {
    throw new Error(`python3 failed: ${child.stderr || child.error?.message}`);
  }
  return JSON.parse(child.stdout) as RunOutcome;
}

const questions = JSON.parse(
  await readFile(path.join(root, ".velite/questions.json"), "utf8"),
) as Question[];
const labs = questions.filter((question) => question.type === "code");
const problems: string[] = [];

for (const lab of labs) {
  const starter = run(lab.starter, lab.tests);
  if (starter.error) {
    problems.push(
      `${lab.id}: the starter code fails with ${starter.error.type}: ${starter.error.message} (line ${starter.error.line})`,
    );
    continue;
  }
  if (lab.tests === undefined) {
    console.log(`ok  ${lab.id} (playground runs)`);
    continue;
  }
  if (starter.tests.every((test) => test.passed)) {
    problems.push(`${lab.id}: the starter code already passes every test.`);
  }

  const solutionPath = path.join(
    root,
    "tests/fixtures/solutions",
    `${lab.id}.py`,
  );
  if (!existsSync(solutionPath)) {
    problems.push(
      `${lab.id}: no reference solution at ${path.relative(root, solutionPath)}.`,
    );
    continue;
  }
  const solved = run(await readFile(solutionPath, "utf8"), lab.tests);
  const failed = solved.tests.filter((test) => !test.passed);
  if (solved.error || failed.length > 0) {
    problems.push(
      `${lab.id}: the reference solution does not pass: ${
        solved.error?.message ??
        failed.map((test) => `${test.name} (${test.message})`).join("; ")
      }`,
    );
    continue;
  }
  console.log(
    `ok  ${lab.id} (${solved.tests.length} tests; starter fails, solution passes)`,
  );
}

if (problems.length > 0) {
  console.error(`\n${problems.join("\n")}`);
  process.exit(1);
}
console.log(`\nVerified ${labs.length} code lab(s).`);
