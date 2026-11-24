import { type MathNode, OperatorNode, parse } from "mathjs";

import { createRandom } from "./prng";

/**
 * Parsing and comparing mathematical expressions typed by learners.
 *
 * Input is untrusted, so nothing is evaluated until the parsed tree has been
 * checked against a whitelist: numbers, the declared variables, π and e,
 * + − × ÷ ^, and a fixed set of functions. That rules out assignments,
 * matrices, units, imports and anything slow.
 */

const MAX_LENGTH = 200;

const allowedFunctions: Record<string, (x: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  exp: Math.exp,
  ln: Math.log,
  log10: Math.log10,
  log2: Math.log2,
  abs: Math.abs,
};
const constants: Record<string, number> = { pi: Math.PI, e: Math.E };
const allowedOperators = new Set(["+", "-", "*", "/", "^"]);
const superscripts: Record<string, string> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
};

export type ExpressionErrorCode =
  | "empty"
  | "too-long"
  | "syntax"
  | "unknown-symbol"
  | "unknown-function"
  | "ambiguous-log"
  | "not-allowed";

export type ParsedExpression =
  | { ok: true; evaluate: (values: Record<string, number>) => number }
  | { ok: false; error: ExpressionErrorCode; detail?: string };

/** Rewrites what people actually type into what the parser expects. */
export function normaliseExpression(input: string): string {
  return (
    input
      .trim()
      .replace(/^(?:[a-zA-Z]'?\s*(?:\(\s*[a-zA-Z]\s*\))?\s*)?[=≈]\s*/, "") // "f'(x) = …"
      .replace(/[−–—]/g, "-")
      .replace(/[×·⋅∙]/g, "*")
      .replace(/[÷∕]/g, "/")
      .replace(/\*\*/g, "^")
      .replace(/π/g, "pi")
      .replace(/√\s*\(/g, "sqrt(")
      .replace(/√\s*([a-zA-Z0-9.]+)/g, "sqrt($1)")
      .replace(
        /[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g,
        (digits) =>
          `^${[...digits].map((digit) => superscripts[digit]).join("")}`,
      )
      // A decimal comma between digits, as in "3,5". (Function calls never
      // take two arguments here, so a comma has no other meaning.)
      .replace(/(\d),(\d)/g, "$1.$2")
  );
}

export function parseExpression(
  input: string,
  variables: readonly string[] = [],
): ParsedExpression {
  const source = normaliseExpression(input);
  if (source === "") return { ok: false, error: "empty" };
  if (source.length > MAX_LENGTH) return { ok: false, error: "too-long" };

  let tree: MathNode;
  try {
    tree = parse(source);
  } catch {
    return { ok: false, error: "syntax" };
  }

  // "x(x + 1)" parses as a call to a function named x. Read it as a product.
  tree = tree.transform((node) => {
    if (
      node.type === "FunctionNode" &&
      "fn" in node &&
      "args" in node &&
      variables.includes((node.fn as { name: string }).name) &&
      (node.args as MathNode[]).length === 1
    ) {
      return new OperatorNode("*", "multiply", [
        node.fn as MathNode,
        (node.args as MathNode[])[0]!,
      ]);
    }
    return node;
  });

  let problem: ParsedExpression | null = null;
  tree.traverse((node, _path, parent) => {
    if (problem) return;
    switch (node.type) {
      case "ConstantNode":
        if (typeof (node as unknown as { value: unknown }).value !== "number") {
          problem = { ok: false, error: "not-allowed" };
        }
        break;
      case "ParenthesisNode":
        break;
      case "OperatorNode":
        if (!allowedOperators.has((node as unknown as { op: string }).op)) {
          problem = { ok: false, error: "not-allowed" };
        }
        break;
      case "FunctionNode": {
        const name = (node as unknown as { fn: { name?: string } }).fn.name;
        const args = (node as unknown as { args: MathNode[] }).args;
        if (name === "log") {
          problem = { ok: false, error: "ambiguous-log" };
        } else if (!name || !Object.hasOwn(allowedFunctions, name)) {
          problem = { ok: false, error: "unknown-function", detail: name };
        } else if (args.length !== 1) {
          problem = { ok: false, error: "not-allowed" };
        }
        break;
      }
      case "SymbolNode": {
        const name = (node as unknown as { name: string }).name;
        const isFunctionName =
          parent?.type === "FunctionNode" &&
          (parent as unknown as { fn: MathNode }).fn === node;
        if (isFunctionName) break;
        if (name === "log") {
          problem = { ok: false, error: "ambiguous-log" };
        } else if (Object.hasOwn(allowedFunctions, name)) {
          // e.g. "sin x": a function with no brackets.
          problem = { ok: false, error: "syntax" };
        } else if (
          !variables.includes(name) &&
          !Object.hasOwn(constants, name)
        ) {
          problem = { ok: false, error: "unknown-symbol", detail: name };
        }
        break;
      }
      default:
        problem = { ok: false, error: "not-allowed" };
    }
  });
  if (problem) return problem;

  const compiled = tree.compile();
  return {
    ok: true,
    evaluate(values) {
      try {
        const result: unknown = compiled.evaluate({
          ...allowedFunctions,
          ...constants,
          ...values,
        });
        return typeof result === "number" ? result : Number.NaN;
      } catch {
        return Number.NaN;
      }
    },
  };
}

/** True when two numbers agree to about nine significant figures. */
export function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
}

export type Equivalence = "equal" | "different" | "undetermined";

const SAMPLE_POINTS = 8;
const MAX_TRIES = 80;

/**
 * Decides whether two expressions are the same function by comparing them at
 * random points. Points where the expected expression is undefined (say,
 * √x for negative x) are skipped; if the learner's expression is undefined
 * where the expected one is not, they differ.
 */
export function compareExpressions(
  expected: (values: Record<string, number>) => number,
  actual: (values: Record<string, number>) => number,
  variables: readonly string[],
  seed = 1,
): Equivalence {
  const random = createRandom(seed);
  let compared = 0;
  for (let tries = 0; tries < MAX_TRIES && compared < SAMPLE_POINTS; tries++) {
    const values: Record<string, number> = {};
    for (const name of variables) {
      // Mostly modest values, away from the round numbers where different
      // expressions are most likely to coincide.
      values[name] = Number((random() * 6 - 3).toFixed(4)) + 0.00137;
    }
    const want = expected(values);
    if (!Number.isFinite(want)) continue;
    const got = actual(values);
    if (!Number.isFinite(got) || !nearlyEqual(want, got)) return "different";
    compared++;
  }
  return compared === SAMPLE_POINTS ? "equal" : "undetermined";
}
