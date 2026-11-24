import type { RunOutcome } from "./harness";

/** Messages between the page and public/python-worker.mjs. */

export interface WorkerConfig {
  /** Where the Pyodide runtime is served from (same origin). */
  indexURL: string;
  /** Where numpy, matplotlib and other packages are downloaded from. */
  packageBaseUrl: string;
  /** Python source of the run-and-test harness (lib/codelab/harness.ts). */
  harness: string;
}

export interface WorkerRequest {
  id: number;
  code: string;
  tests?: string;
  config: WorkerConfig;
}

export type RunStatus = "loading-python" | "loading-packages" | "running";

export type WorkerMessage =
  | { type: "status"; id: number; status: RunStatus }
  | { type: "stdout"; id: number; text: string }
  | { type: "done"; id: number; outcome: RunOutcome }
  | { type: "crash"; id: number; message: string };
