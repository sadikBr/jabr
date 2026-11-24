/**
 * Python that runs a learner's program and, optionally, a set of tests
 * against it. The same source runs in the browser (Pyodide worker) and in
 * scripts/verify-code.ts (system Python), so both agree on what "passes".
 *
 * `__jabr_run(code, tests)` returns JSON:
 *   { error: null | { type, message, line }, tests: [{ name, passed, message }], plots: [base64 PNG] }
 */
export const PYTHON_HARNESS = `
import json, sys, warnings

def __jabr_error(exc, filename):
    line = None
    tb = exc.__traceback__
    while tb is not None:
        if tb.tb_frame.f_code.co_filename == filename:
            line = tb.tb_lineno
        tb = tb.tb_next
    if isinstance(exc, SyntaxError) and exc.filename == filename:
        line = exc.lineno
    message = exc.msg if isinstance(exc, SyntaxError) else str(exc)
    return {"type": type(exc).__name__, "message": message, "line": line}

def __jabr_plots(code):
    """Collects every figure the program draws. Returns the list they go in."""
    images = []
    if "matplotlib" not in code:
        return images
    import base64, io
    import matplotlib
    matplotlib.use("Agg", force=True)  # draw to images; there is no window
    import matplotlib.pyplot as plt
    plt.close("all")

    def capture(*args, **kwargs):
        # Saving can raise library warnings that are nothing to do with the
        # learner's program; keep them out of its output.
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            for number in plt.get_fignums():
                buffer = io.BytesIO()
                plt.figure(number).savefig(buffer, format="png", dpi=110, bbox_inches="tight")
                images.append(base64.b64encode(buffer.getvalue()).decode("ascii"))
            plt.close("all")

    # plt.show() hands the figures over; anything left at the end is collected too.
    plt.show = capture
    images_capture.append(capture)
    return images

images_capture = []

def __jabr_run(code, tests=None):
    warnings.filterwarnings("ignore", message=".*non-interactive.*")
    namespace = {"__name__": "__main__"}
    error = None
    results = []
    plots = []
    images_capture.clear()
    try:
        plots = __jabr_plots(code)
        exec(compile(code, "main.py", "exec"), namespace)
    except BaseException as exc:
        error = __jabr_error(exc, "main.py")

    if tests and error is None:
        test_namespace = dict(namespace)
        try:
            exec(compile(tests, "tests.py", "exec"), test_namespace)
        except BaseException as exc:
            error = __jabr_error(exc, "tests.py")
        else:
            for name, check in list(test_namespace.items()):
                if not (name.startswith("test_") and callable(check)):
                    continue
                try:
                    check()
                    results.append({"name": name, "passed": True, "message": ""})
                except AssertionError as exc:
                    results.append({"name": name, "passed": False, "message": str(exc) or "The check did not pass."})
                except BaseException as exc:
                    results.append({"name": name, "passed": False, "message": f"{type(exc).__name__}: {exc}"})

    try:
        for capture in images_capture:
            capture()
    except BaseException as exc:
        if error is None:
            error = {"type": type(exc).__name__, "message": str(exc), "line": None}
    return json.dumps({"error": error, "tests": results, "plots": plots})
`;

export interface RunError {
  type: string;
  message: string;
  /** Line in the learner's code, when the error can be traced to one. */
  line: number | null;
}

export interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

export interface RunOutcome {
  error: RunError | null;
  tests: TestResult[];
  /** PNG images, base64-encoded. */
  plots: string[];
}

/** Turns `test_reaches_the_ground` into "Reaches the ground". */
export function describeTest(name: string): string {
  const words = name
    .replace(/^test_/, "")
    .replaceAll("_", " ")
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
