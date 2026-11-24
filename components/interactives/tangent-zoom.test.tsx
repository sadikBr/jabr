import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithIntl } from "@/tests/unit/render";

import { TangentZoom } from "./tangent-zoom";

const slope = () => screen.getByTestId("secant-slope");
const zoomIn = () => screen.getByRole("button", { name: "Zoom in ×10" });

describe("TangentZoom", () => {
  it("starts with the secant slope over a window of width 1", () => {
    renderWithIntl(<TangentZoom fn="x^2" x0={1} />);
    expect(slope()).toHaveTextContent("3");
    expect(screen.getByRole("img")).toHaveAccessibleName(/f\(x\) = x\^2/);
  });

  it("approaches the derivative as you zoom in: 3 → 2.1 → 2.01 → 2.001", () => {
    renderWithIntl(<TangentZoom fn="x^2" x0={1} />);
    for (const expected of ["2.1", "2.01", "2.001", "2.0001"]) {
      fireEvent.click(zoomIn());
      expect(slope()).toHaveTextContent(new RegExp(`^${expected}$`));
    }
    expect(zoomIn()).toBeDisabled();
    expect(screen.getByText(/almost indistinguishable/)).toBeVisible();
  });

  it("zooms with the slider, which is reachable by keyboard", () => {
    renderWithIntl(<TangentZoom fn="x^2" x0={1} />);
    const slider = screen.getByRole("slider", { name: /Zoom/ });
    fireEvent.change(slider, { target: { value: "2" } });
    expect(slope()).toHaveTextContent("2.01");
    expect(slider).toHaveAttribute("aria-valuetext", "100×");
  });

  it("moves the point and resets", () => {
    renderWithIntl(<TangentZoom fn="x^2" x0={1} />);
    fireEvent.change(screen.getByRole("slider", { name: /Point x/ }), {
      target: { value: "2" },
    });
    // Secant slope of x² from 2 to 3 is 5.
    expect(slope()).toHaveTextContent("5");
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(slope()).toHaveTextContent("3");
  });

  it("announces the current values for screen readers", () => {
    renderWithIntl(<TangentZoom fn="x^2" x0={1} />);
    fireEvent.click(zoomIn());
    expect(
      screen.getByText(
        "Zoom 10 times. Window width h = 0.1. Secant slope 2.1.",
      ),
    ).toBeInTheDocument();
  });
});
