import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/tests/unit/render";

import { DropTest } from "./drop-test";
import { EulerStepper } from "./euler-stepper";
import { ProjectileSim } from "./projectile-sim";

// With reduced motion the simulations jump straight to their result, which
// is also what makes them testable without waiting for animation frames.
beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
});

const setSlider = (name: RegExp, value: number) =>
  fireEvent.change(screen.getByRole("slider", { name }), {
    target: { value: String(value) },
  });

describe("ProjectileSim", () => {
  it("lands where the range formula says", () => {
    renderWithIntl(<ProjectileSim speed={20} angle={45} gravity={9.81} />);
    expect(screen.getByTestId("projectile-range")).toHaveTextContent("–");
    fireEvent.click(screen.getByRole("button", { name: "Launch" }));
    expect(screen.getByTestId("projectile-range")).toHaveTextContent("40.8 m");
  });

  it("lands shorter with air resistance on", () => {
    renderWithIntl(<ProjectileSim speed={20} angle={45} gravity={9.81} />);
    fireEvent.click(screen.getByRole("switch", { name: /Air resistance/ }));
    fireEvent.click(screen.getByRole("button", { name: "Launch" }));
    const landed = Number.parseFloat(
      screen.getByTestId("projectile-range").textContent!,
    );
    expect(landed).toBeGreaterThan(20);
    expect(landed).toBeLessThan(36);
  });

  it("reports a miss, then a hit, and announces the goal once", () => {
    const onGoal = vi.fn();
    const { container } = renderWithIntl(
      <ProjectileSim
        speed={18}
        angle={30}
        gravity={9.81}
        goal={{ target: 62, tolerance: 1.5 }}
      />,
    );
    container.addEventListener("jabr:goal", onGoal);
    const status = () => screen.getByTestId("projectile-status");
    expect(status()).toHaveTextContent("Land the ball on the flag at 62 m.");

    fireEvent.click(screen.getByRole("button", { name: "Launch" }));
    expect(status()).toHaveTextContent("33.4 m short");
    expect(onGoal).not.toHaveBeenCalled();

    // 25 m/s at 38°: 25² · sin(76°) / 9.81 = 61.8 m
    setSlider(/Launch speed/, 25);
    setSlider(/Launch angle/, 38);
    expect(status()).toHaveTextContent("Land the ball on the flag");
    fireEvent.click(screen.getByRole("button", { name: "Launch" }));
    expect(status()).toHaveTextContent(
      "Bullseye! It landed at 61.8 m, on shot 2.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Launch" }));
    expect(onGoal).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Move the target" }),
    ).toBeVisible();
  });

  it("describes the scene for screen readers", () => {
    renderWithIntl(<ProjectileSim speed={20} angle={45} gravity={9.81} />);
    expect(screen.getByRole("img")).toHaveAccessibleName(
      /20 metres per second, 45 degrees/,
    );
  });
});

describe("DropTest", () => {
  const drop = () =>
    fireEvent.click(screen.getByRole("button", { name: /Drop/ }));

  it("is a tie on the Moon, where the air switch is off and locked", () => {
    renderWithIntl(<DropTest place="moon" air />);
    expect(screen.getByRole("switch", { name: /Air/ })).toBeDisabled();
    expect(screen.getByRole("switch", { name: /Air/ })).not.toBeChecked();
    drop();
    expect(screen.getByTestId("drop-hammer")).toHaveTextContent("1.41 s");
    expect(screen.getByTestId("drop-feather")).toHaveTextContent("1.41 s");
    expect(screen.getByText(/A tie/)).toBeVisible();
  });

  it("separates them on Earth with air, and ties again without it", () => {
    renderWithIntl(<DropTest place="moon" air />);
    fireEvent.click(screen.getByRole("radio", { name: "Earth" }));
    drop();
    expect(screen.getByTestId("drop-hammer")).toHaveTextContent("0.57 s");
    expect(screen.getByTestId("drop-feather")).toHaveTextContent("1.05 s");
    expect(screen.getByText(/The feather lands 0.48 s later/)).toBeVisible();

    fireEvent.click(screen.getByRole("switch", { name: /Air/ }));
    expect(screen.getByTestId("drop-feather")).toHaveTextContent("–");
    drop();
    expect(screen.getByTestId("drop-feather")).toHaveTextContent("0.57 s");
    expect(screen.getByText(/A tie/)).toBeVisible();
  });
});

describe("EulerStepper", () => {
  const error = () => Number(screen.getByTestId("euler-error").textContent);

  it("shows the textbook error for two steps of dy/dt = y", () => {
    renderWithIntl(<EulerStepper problem="growth" steps={2} />);
    // Euler reaches 4 where the exact answer is e² = 7.389.
    expect(error()).toBeCloseTo(3.389, 3);
  });

  it("gets more accurate with more steps", () => {
    renderWithIntl(<EulerStepper problem="growth" steps={2} />);
    const coarse = error();
    setSlider(/Number of steps/, 40);
    expect(error()).toBeLessThan(coarse / 5);
  });

  it("announces the goal when the error is small enough", () => {
    const onGoal = vi.fn();
    const { container } = renderWithIntl(
      <EulerStepper
        problem="falling-with-drag"
        steps={3}
        goal={{ maxError: 0.1 }}
      />,
    );
    container.addEventListener("jabr:goal", onGoal);
    expect(
      screen.getByText(/Add steps until the error is 0.1 or less/),
    ).toBeVisible();
    setSlider(/Number of steps/, 16);
    expect(onGoal).not.toHaveBeenCalled();
    setSlider(/Number of steps/, 32);
    expect(screen.getByText(/32 steps is enough/)).toBeVisible();
    expect(onGoal).toHaveBeenCalledTimes(1);
  });
});
