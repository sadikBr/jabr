import { PYTHON_HARNESS, type RunOutcome } from "./harness";
import type {
  RunStatus,
  WorkerConfig,
  WorkerMessage,
  WorkerRequest,
} from "./protocol";

export type { RunStatus };

export type RunResult =
  | { kind: "finished"; outcome: RunOutcome }
  | { kind: "stopped" }
  | { kind: "timed-out" }
  /** Python itself could not start or load a package (usually: offline). */
  | { kind: "unavailable"; message: string };

export interface RunOptions {
  code: string;
  tests?: string;
  onStatus?: (status: RunStatus) => void;
  onOutput?: (text: string) => void;
  timeoutMs?: number;
}

// The runtime is copied into public/pyodide/v<version>/ on install
// (scripts/copy-pyodide.ts); the version in the path keeps caches honest.
const VERSION = process.env.NEXT_PUBLIC_PYODIDE_VERSION;
const WORKER_URL = `/python-worker.mjs?v=${VERSION}`;
const DEFAULT_TIMEOUT_MS = 30_000;

function workerConfig(): WorkerConfig {
  return {
    indexURL: new URL(`/pyodide/v${VERSION}/`, window.location.origin).href,
    packageBaseUrl: `https://cdn.jsdelivr.net/pyodide/v${VERSION}/full/`,
    harness: PYTHON_HARNESS,
  };
}

/**
 * One shared Python worker for the whole page. Python cannot be interrupted
 * from outside, so stopping (or timing out) terminates the worker; the next
 * run starts a fresh one, which is quick once the runtime is cached.
 */
let worker: Worker | null = null;
let nextId = 1;
let active: { id: number; finish: (result: RunResult) => void } | null = null;

function getWorker(): Worker {
  // A plain URL, not `new URL(…, import.meta.url)`: Pyodide needs a real
  // module worker, which the bundler would not produce.
  worker ??= new Worker(WORKER_URL, { type: "module" });
  return worker;
}

function discardWorker(): void {
  worker?.terminate();
  worker = null;
}

/** Stops the program that is running, if any. */
export function stopPython(): void {
  if (!active) return;
  discardWorker();
  active.finish({ kind: "stopped" });
}

export function runPython(options: RunOptions): Promise<RunResult> {
  // Only one program runs at a time; a new run replaces the old one.
  stopPython();
  const id = nextId++;
  const pythonWorker = getWorker();

  return new Promise<RunResult>((resolve) => {
    // The clock starts once the program itself is running, so a slow first
    // download of Python does not count against it.
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = (result: RunResult) => {
      if (active?.id !== id) return;
      active = null;
      clearTimeout(timer);
      pythonWorker.removeEventListener("message", onMessage);
      pythonWorker.removeEventListener("error", onError);
      resolve(result);
    };
    active = { id, finish };

    function onMessage(event: MessageEvent<WorkerMessage>) {
      const message = event.data;
      if (message.id !== id) return;
      switch (message.type) {
        case "status":
          options.onStatus?.(message.status);
          if (message.status === "running") {
            timer = setTimeout(() => {
              discardWorker();
              finish({ kind: "timed-out" });
            }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
          }
          break;
        case "stdout":
          options.onOutput?.(message.text);
          break;
        case "done":
          finish({ kind: "finished", outcome: message.outcome });
          break;
        case "crash":
          discardWorker();
          finish({ kind: "unavailable", message: message.message });
          break;
      }
    }
    function onError(event: ErrorEvent) {
      discardWorker();
      finish({ kind: "unavailable", message: event.message });
    }

    pythonWorker.addEventListener("message", onMessage);
    pythonWorker.addEventListener("error", onError);
    const request: WorkerRequest = {
      id,
      code: options.code,
      tests: options.tests,
      config: workerConfig(),
    };
    pythonWorker.postMessage(request);
  });
}
