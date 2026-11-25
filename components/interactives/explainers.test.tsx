import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithIntl } from "@/tests/unit/render";

import { GameLoop } from "./game-loop";
import { OrbitCannon } from "./orbit-cannon";

// With reduced motion the simulations jump straight to their result.
beforeEach(() => {
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
});

const setSlider = (name: RegExp, value: number) =>
  fireEvent.change(screen.getByRole("slider", { name }), {
    target: { value: String(value) },
  });
const click = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole("button", { name }));

describe("OrbitCannon", () => {
  it("falls, orbits or escapes, depending on the speed", () => {
    const onGoal = vi.fn();
    const { container } = renderWithIntl(
      <OrbitCannon speed={4} altitude={400} goal />,
    );
    container.addEventListener("jabr:goal", onGoal);
    const status = () => screen.getByTestId("orbit-status");
    expect(status()).toHaveTextContent("The cannon is 400 km up");

    click("Fire");
    expect(status()).toHaveTextContent(/It falls back to Earth \d+ km round/);
    expect(screen.getByTestId("orbit-period")).toHaveTextContent("–");
    expect(onGoal).not.toHaveBeenCalled();

    // Changing the speed clears the last result.
    setSlider(/Launch speed/, 7.7);
    expect(status()).toHaveTextContent("The cannon is 400 km up");
    click("Fire");
    expect(status()).toHaveTextContent(/An orbit\. It circles \d+ km up/);
    expect(screen.getByTestId("orbit-lowest")).toHaveTextContent("400 km");
    expect(screen.getByTestId("orbit-period")).toHaveTextContent("93 min");
    expect(screen.getByText(/In orbit\. It is still falling/)).toBeVisible();
    expect(onGoal).toHaveBeenCalledTimes(1);

    setSlider(/Launch speed/, 9);
    click("Fire");
    expect(status()).toHaveTextContent(
      "it swings out to 8558 km and back to 400 km",
    );

    setSlider(/Launch speed/, 11);
    click("Fire");
    expect(status()).toHaveTextContent("It escapes the Earth altogether.");
  });

  it("simply drops with no sideways speed", () => {
    renderWithIntl(<OrbitCannon speed={0} altitude={400} goal={false} />);
    click("Fire");
    expect(screen.getByTestId("orbit-status")).toHaveTextContent(
      "With no sideways speed it simply falls, hitting the ground after 5 minutes.",
    );
  });
});

describe("GameLoop", () => {
  it("bounces at a high frame rate and falls through at a low one", () => {
    const onGoal = vi.fn();
    const { container } = renderWithIntl(
      <GameLoop fps={60} sweep={false} goal="break" />,
    );
    container.addEventListener("jabr:goal", onGoal);
    const status = () => screen.getByTestId("game-status");
    // 9.9 m/s at the platform, 60 times a second.
    expect(screen.getByTestId("game-stride")).toHaveTextContent("16 cm");

    click("Drop the ball");
    expect(status()).toHaveTextContent(
      "4 bounces in five seconds, and the ball is still on the platform.",
    );
    expect(onGoal).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("radio", { name: "10" }));
    expect(screen.getByTestId("game-stride")).toHaveTextContent("99 cm");
    click("Drop the ball");
    expect(status()).toHaveTextContent(
      "At 1 s the ball was above the platform in one frame and below it in the next.",
    );
    expect(screen.getByText(/^Broken\./)).toBeVisible();
    expect(onGoal).toHaveBeenCalledTimes(1);
  });

  it("is fixed by checking the path, not only by more frames", () => {
    const onGoal = vi.fn();
    const { container } = renderWithIntl(
      <GameLoop fps={15} sweep={false} goal="fix" />,
    );
    container.addEventListener("jabr:goal", onGoal);

    click("Drop the ball");
    expect(screen.getByTestId("game-status")).toHaveTextContent(
      "The game never saw them touch.",
    );

    // More frames stops the ball falling, but is not the fix asked for.
    fireEvent.click(screen.getByRole("radio", { name: "60" }));
    click("Drop the ball");
    expect(screen.getByTestId("game-status")).toHaveTextContent("4 bounces");
    expect(onGoal).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("radio", { name: "15" }));
    fireEvent.click(
      screen.getByRole("switch", { name: /Check the path between frames/ }),
    );
    click("Drop the ball");
    expect(screen.getByTestId("game-status")).toHaveTextContent("4 bounces");
    expect(screen.getByText(/^Fixed\./)).toBeVisible();
    expect(onGoal).toHaveBeenCalledTimes(1);
  });
});
