import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { interactiveSpecs } from "@/lib/content/interactive-specs";
import { renderWithIntl } from "@/tests/unit/render";

import { DerivativeExplorer } from "./derivative-explorer";
import { LimitExplorer } from "./limit-explorer";
import { MotionGraphs } from "./motion-graphs";
import { SecantExplorer } from "./secant-explorer";

beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
});

const setSlider = (name: RegExp, value: number) =>
  fireEvent.change(screen.getByRole("slider", { name }), {
    target: { value: String(value) },
  });
const click = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole("button", { name }));

/** Fills in the defaults the server would, as <Interactive> does. */
const secantProps = (props: object) =>
  interactiveSpecs["secant-explorer"].props.parse(props);

describe("SecantExplorer", () => {
  it("finds the average speed between two readings, and the fastest stretch", () => {
    const onGoal = vi.fn();
    const { container } = renderWithIntl(
      <SecantExplorer
        {...secantProps({
          dataset: "sprint",
          a: 0,
          b: 9.58,
          labels: "motion",
          goal: { min: 12.3 },
        })}
      />,
    );
    container.addEventListener("jabr:goal", onGoal);
    const slope = () => screen.getByTestId("secant-explorer-slope");

    // The whole race: 100 m in 9.58 s.
    expect(slope()).toHaveTextContent("10.44 m/s");
    expect(
      screen.getByText(
        "Find the stretch where the average speed is at least 12.3 m/s.",
      ),
    ).toBeVisible();
    expect(onGoal).not.toHaveBeenCalled();

    // From the 60 m mark to the 70 m mark. Move the end first: the start
    // cannot pass it.
    setSlider(/End/, 7);
    setSlider(/Start/, 6);
    expect(slope()).toHaveTextContent("12.35 m/s");
    expect(
      screen.getByText("Found it: 12.35 m/s between 6.29 s and 7.1 s."),
    ).toBeVisible();
    expect(onGoal).toHaveBeenCalledTimes(1);
  });

  it("keeps the first point before the second", () => {
    renderWithIntl(
      <SecantExplorer {...secantProps({ dataset: "sprint", a: 0, b: 2.88 })} />,
    );
    setSlider(/First point/, 9);
    // The second point is the 20 m reading, so the first stops at 10 m.
    expect(screen.getByTestId("secant-explorer-slope")).toHaveTextContent(
      "10.1 m/s",
    );
  });

  it("works on a function, where a shrinking interval settles the slope", () => {
    renderWithIntl(
      <SecantExplorer {...secantProps({ fn: "x^2", a: 2, b: 4 })} />,
    );
    const slope = () => screen.getByTestId("secant-explorer-slope");
    expect(slope()).toHaveTextContent("6");
    setSlider(/Second point/, 25); // x = 2.5
    expect(slope()).toHaveTextContent("4.5");
    setSlider(/Second point/, 21); // x = 2.1
    expect(slope()).toHaveTextContent("4.1");
  });
});

describe("LimitExplorer", () => {
  it("reveals the values as the learner closes in, then the verdict", () => {
    const onGoal = vi.fn();
    const { container } = renderWithIntl(
      <LimitExplorer cases={["hole"]} mode="limit" />,
    );
    container.addEventListener("jabr:goal", onGoal);
    const table = screen.getByRole("table");
    const row = (distance: string) =>
      within(table).getByRole("row", { name: new RegExp(`^${distance} `) });

    expect(row("1")).toHaveTextContent("13"); // f(0) = 1 and f(2) = 3
    expect(row("0.01")).toHaveTextContent("??");
    expect(screen.getByTestId("limit-value-at-point")).toHaveTextContent(
      "not defined",
    );
    expect(screen.queryByTestId("limit-verdict")).not.toBeInTheDocument();

    click("10× closer");
    click("10× closer");
    expect(row("0.01")).toHaveTextContent("1.992.01");
    expect(onGoal).not.toHaveBeenCalled();

    click("10× closer");
    expect(screen.getByTestId("limit-verdict")).toHaveTextContent(
      "From both sides the values close in on 2.",
    );
    expect(onGoal).toHaveBeenCalledTimes(1);

    // Backing off keeps what has been found.
    click("Back off");
    expect(row("0.01")).toHaveTextContent("1.992.01");
  });

  it("checks the three tests for continuity", () => {
    const onGoal = vi.fn();
    const { container } = renderWithIntl(
      <LimitExplorer cases={["smooth", "jump"]} mode="continuity" />,
    );
    container.addEventListener("jabr:goal", onGoal);
    const closeIn = () => setSlider(/Distance from/, 3);

    closeIn();
    expect(screen.getByText("Continuous at x = 2.")).toBeVisible();
    expect(onGoal).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("radio", { name: "Jump" }));
    expect(screen.queryByTestId("limit-verdict")).not.toBeInTheDocument();
    closeIn();
    expect(screen.getByTestId("limit-verdict")).toHaveTextContent(
      "From the left the values close in on 2; from the right, on 3.",
    );
    expect(screen.getByText("Not continuous at x = 2.")).toBeVisible();
    // The goal is to have looked closely at every function on offer.
    expect(onGoal).toHaveBeenCalledTimes(1);
  });

  it("shows values that never settle", () => {
    renderWithIntl(<LimitExplorer cases={["blow-up"]} mode="limit" />);
    setSlider(/Distance from/, 3);
    expect(
      within(screen.getByRole("table")).getByRole("row", { name: /^0.001 / }),
    ).toHaveTextContent("10000001000000");
    expect(screen.getByTestId("limit-verdict")).toHaveTextContent(
      "There is no number they settle on",
    );
  });
});

describe("DerivativeExplorer", () => {
  it("shows the slope at the point and traces the derivative", () => {
    const onGoal = vi.fn();
    const { container } = renderWithIntl(
      <DerivativeExplorer fns={["x^2", "x^3"]} />,
    );
    container.addEventListener("jabr:goal", onGoal);
    const slope = () => screen.getByTestId("derivative-slope");

    // Starts at x = 1.2 on x², where the slope is 2.4.
    expect(slope()).toHaveTextContent("2.4");
    expect(screen.getByText(/0% traced/)).toBeVisible();

    setSlider(/Point x/, 0);
    expect(slope()).toHaveTextContent("-6");
    expect(screen.getByText(/70% traced/)).toBeVisible();
    setSlider(/Point x/, 120);
    expect(
      screen.getByText("Traced. The derivative of x² is 2x."),
    ).toBeVisible();
    // There is another function still to trace.
    expect(onGoal).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("radio", { name: "f(x) = x³" }));
    expect(screen.getByText(/0% traced/)).toBeVisible();
    setSlider(/Point x/, 0);
    setSlider(/Point x/, 120);
    expect(
      screen.getByText("Traced. The derivative of x³ is 3x²."),
    ).toBeVisible();
    expect(onGoal).toHaveBeenCalledTimes(1);

    click("Clear");
    expect(screen.getByText(/0% traced/)).toBeVisible();
  });
});

describe("MotionGraphs", () => {
  it("reads height and velocity from the clock, and spots the top", () => {
    const onGoal = vi.fn();
    const { container } = renderWithIntl(
      <MotionGraphs speed={15} goal="peak" />,
    );
    container.addEventListener("jabr:goal", onGoal);
    const velocity = () => screen.getByTestId("motion-velocity");

    expect(velocity()).toHaveTextContent("15 m/s");
    expect(
      screen.getByText("Stop the clock at the very top of the flight."),
    ).toBeVisible();

    // v = 15 − 9.8 × 1 and h = 15 × 1 − 4.9 × 1²
    setSlider(/Time/, 1);
    expect(velocity()).toHaveTextContent("5.2 m/s");
    expect(screen.getByTestId("motion-height")).toHaveTextContent("10.1 m");
    expect(onGoal).not.toHaveBeenCalled();

    setSlider(/Time/, 1.53);
    expect(velocity()).toHaveTextContent("0.01 m/s");
    expect(screen.getByText(/That's the top/)).toBeVisible();
    expect(onGoal).toHaveBeenCalledTimes(1);
  });

  it("plays the whole flight, landing as fast as it left", () => {
    renderWithIntl(<MotionGraphs speed={20} />);
    click("Throw");
    expect(screen.getByTestId("motion-velocity")).toHaveTextContent("-20 m/s");
    expect(screen.getByTestId("motion-height")).toHaveTextContent("0 m");
    click("Jump to the top");
    expect(screen.getByTestId("motion-velocity")).toHaveTextContent(
      /^-?0(\.0\d)? m\/s$/,
    );
  });
});
