/*
 * Runs Python (Pyodide) in a module Web Worker so the page never freezes.
 * Plain JavaScript on purpose: Pyodide needs a real module worker, so this
 * file is served as-is rather than bundled. Types for the messages live in
 * lib/codelab/protocol.ts; lib/codelab/runner.ts is the only caller.
 *
 * One program runs at a time. The page stops a runaway program by
 * terminating this worker.
 */

let runtime = null;
let currentRun = 0;

const post = (message) => self.postMessage(message);

function loadRuntime({ indexURL, packageBaseUrl, harness }) {
  runtime ??= (async () => {
    const { loadPyodide } = await import(`${indexURL}pyodide.mjs`);
    const pyodide = await loadPyodide({ indexURL, packageBaseUrl });
    // Plots are rendered to images; there is no window to draw into.
    pyodide.runPython('import os; os.environ["MPLBACKEND"] = "Agg"');
    pyodide.runPython(harness);
    const forward = (text) => post({ type: "stdout", id: currentRun, text });
    pyodide.setStdout({ batched: forward });
    pyodide.setStderr({ batched: forward });
    return pyodide;
  })();
  // A failed load (say, offline on first use) should be retried next time.
  runtime.catch(() => {
    runtime = null;
  });
  return runtime;
}

self.onmessage = async (event) => {
  const { id, code, tests, config } = event.data;
  currentRun = id;
  try {
    post({ type: "status", id, status: "loading-python" });
    const pyodide = await loadRuntime(config);

    post({ type: "status", id, status: "loading-packages" });
    await pyodide.loadPackagesFromImports(`${code}\n${tests ?? ""}`, {
      messageCallback: () => {},
    });

    post({ type: "status", id, status: "running" });
    const run = pyodide.globals.get("__jabr_run");
    const json = run(code, tests ?? null);
    run.destroy();
    post({ type: "done", id, outcome: JSON.parse(json) });
  } catch (cause) {
    post({
      type: "crash",
      id,
      message: cause instanceof Error ? cause.message : String(cause),
    });
  }
};
