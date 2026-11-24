import type { Root } from "mdast";
import type {
  MdxJsxAttribute,
  MdxJsxFlowElement,
  MdxJsxTextElement,
} from "mdast-util-mdx-jsx";
import remarkMath from "remark-math";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";

/** Everything an MDX document references, extracted without rendering it. */
export interface MdxRefs {
  /** Every JSX component name used, so unknown ones fail validation. */
  components: string[];
  steps: { kind: string | null; title: string | null }[];
  layers: string[];
  interactives: { id: string | null; props: unknown }[];
  questions: string[];
  connections: {
    concepts: string[];
    explainers: string[];
    projects: string[];
  }[];
}

type JsxElement = MdxJsxFlowElement | MdxJsxTextElement;

const UNREADABLE = Symbol("unreadable");

/**
 * Reads a JSX attribute value. String literals come through as-is; `{…}`
 * expressions are evaluated as plain JavaScript literals. Content is trusted
 * (it lives in this repo), and anything that fails to evaluate is reported
 * as unreadable rather than thrown.
 */
function readAttribute(element: JsxElement, name: string): unknown {
  const attribute = element.attributes.find(
    (a): a is MdxJsxAttribute =>
      a.type === "mdxJsxAttribute" && a.name === name,
  );
  if (!attribute) return undefined;
  if (attribute.value == null) return true;
  if (typeof attribute.value === "string") return attribute.value;
  try {
    return new Function(`"use strict"; return (${attribute.value.value});`)();
  } catch {
    return UNREADABLE;
  }
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

export function extractMdxRefs(source: string): MdxRefs {
  const tree = unified()
    .use(remarkParse)
    .use(remarkMath)
    .use(remarkMdx)
    .parse(source) as Root;
  const refs: MdxRefs = {
    components: [],
    steps: [],
    layers: [],
    interactives: [],
    questions: [],
    connections: [],
  };
  const components = new Set<string>();

  visit(tree, ["mdxJsxFlowElement", "mdxJsxTextElement"], (node) => {
    const element = node as JsxElement;
    const name = element.name;
    // Lowercase names are plain HTML elements, not components.
    if (!name || name[0] !== name[0]?.toUpperCase()) return;
    components.add(name);

    switch (name) {
      case "Step":
        refs.steps.push({
          kind: asString(readAttribute(element, "kind")),
          title: asString(readAttribute(element, "title")),
        });
        break;
      case "Layer": {
        const depth = asString(readAttribute(element, "depth"));
        if (depth) refs.layers.push(depth);
        break;
      }
      case "Interactive": {
        const props = readAttribute(element, "props");
        refs.interactives.push({
          id: asString(readAttribute(element, "id")),
          props: props === UNREADABLE ? null : (props ?? {}),
        });
        break;
      }
      case "Question": {
        const id = asString(readAttribute(element, "id"));
        if (id) refs.questions.push(id);
        break;
      }
      case "ConnectIt":
        refs.connections.push({
          concepts: asStringArray(readAttribute(element, "concepts")),
          explainers: asStringArray(readAttribute(element, "explainers")),
          projects: asStringArray(readAttribute(element, "projects")),
        });
        break;
    }
  });

  refs.components = [...components].sort();
  return refs;
}
