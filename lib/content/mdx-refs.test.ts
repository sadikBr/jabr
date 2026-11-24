import { describe, expect, it } from "vitest";

import { extractMdxRefs } from "./mdx-refs";

const source = `
Some prose with <Term id="x">inline</Term> and a <span>plain tag</span>.

<Step kind="see" title="See it">
  <Interactive id="tangent-zoom" props={{ fn: "x^2", x0: 1 }} />
</Step>

<Step kind="do" title="Do it">
  <Question id="calc.q1" />
  <Question id="calc.q2" />
</Step>

<Step kind="connect" title="Connect it">
  <ConnectIt concepts={["velocity"]} explainers={["rockets"]} />
</Step>
`;

describe("extractMdxRefs", () => {
  const refs = extractMdxRefs(source);

  it("lists component names but not HTML elements", () => {
    expect(refs.components).toEqual([
      "ConnectIt",
      "Interactive",
      "Question",
      "Step",
      "Term",
    ]);
  });

  it("reads steps in order", () => {
    expect(refs.steps).toEqual([
      { kind: "see", title: "See it" },
      { kind: "do", title: "Do it" },
      { kind: "connect", title: "Connect it" },
    ]);
  });

  it("reads interactive ids and evaluates their props", () => {
    expect(refs.interactives).toEqual([
      { id: "tangent-zoom", props: { fn: "x^2", x0: 1 } },
    ]);
  });

  it("reads question ids and ConnectIt targets", () => {
    expect(refs.questions).toEqual(["calc.q1", "calc.q2"]);
    expect(refs.connections).toEqual([
      { concepts: ["velocity"], explainers: ["rockets"], projects: [] },
    ]);
  });

  it("defaults missing props to an empty object and flags unreadable ones", () => {
    expect(extractMdxRefs(`<Interactive id="a" />`).interactives[0]).toEqual({
      id: "a",
      props: {},
    });
    expect(
      extractMdxRefs(`<Interactive id="a" props={someVariable} />`)
        .interactives[0],
    ).toEqual({ id: "a", props: null });
  });

  it("reads explainer layers", () => {
    expect(
      extractMdxRefs(
        `<Layer depth="intuition">a</Layer>\n\n<Layer depth="maths">b</Layer>`,
      ).layers,
    ).toEqual(["intuition", "maths"]);
  });
});
