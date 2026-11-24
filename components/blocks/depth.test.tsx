import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Depth } from "@/lib/content/vocabulary";
import { renderWithIntl } from "@/tests/unit/render";

import { DepthProvider, Layer } from "./depth";

const layers: Depth[] = ["intuition", "mechanism", "maths"];

function renderExplainer() {
  return renderWithIntl(
    <DepthProvider layers={layers}>
      {layers.map((depth) => (
        <Layer key={depth} depth={depth}>
          <p>Text for {depth}</p>
        </Layer>
      ))}
    </DepthProvider>,
  );
}

describe("explainer depth", () => {
  beforeEach(() => {
    window.location.hash = "";
    Element.prototype.scrollIntoView = vi.fn();
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
  });

  it("starts with only the intuition layer", () => {
    renderExplainer();
    expect(screen.getByText("Text for intuition")).toBeVisible();
    expect(screen.getByText("Text for mechanism")).not.toBeVisible();
    expect(screen.getByText("Text for maths")).not.toBeVisible();
  });

  it("reveals one more layer with Go deeper, keeping the earlier ones", () => {
    renderExplainer();
    fireEvent.click(screen.getByRole("button", { name: /Go deeper/ }));
    expect(screen.getByText("Text for intuition")).toBeVisible();
    expect(screen.getByText("Text for mechanism")).toBeVisible();
    expect(screen.getByText("Text for maths")).not.toBeVisible();
    expect(window.location.hash).toBe("#mechanism");
  });

  it("jumps to any depth from the gauge and never hides what was shown", () => {
    renderExplainer();
    const gauge = screen.getByRole("navigation");
    const maths = screen.getByRole("button", { name: "Maths & science" });
    fireEvent.click(maths);
    expect(screen.getByText("Text for mechanism")).toBeVisible();
    expect(screen.getByText("Text for maths")).toBeVisible();
    expect(maths).toHaveAttribute("aria-pressed", "true");
    expect(gauge).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Intuition" }));
    expect(screen.getByText("Text for maths")).toBeVisible();
  });

  it("celebrates reaching the last layer and offers nothing deeper", () => {
    renderExplainer();
    fireEvent.click(screen.getByRole("button", { name: "Maths & science" }));
    expect(screen.queryByRole("button", { name: /Go deeper/ })).toBeNull();
    expect(screen.getByText(/reached the bottom/)).toBeVisible();
  });

  it("opens at the layer named in the URL hash", () => {
    window.location.hash = "#mechanism";
    renderExplainer();
    expect(screen.getByText("Text for mechanism")).toBeVisible();
  });
});
