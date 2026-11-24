import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  type InteractiveId,
  type InteractiveProps,
  interactiveSpecs,
} from "@/lib/content/interactive-specs";
import { renderWithIntl } from "@/tests/unit/render";

import { BrakingDistance } from "./braking-distance";
import { FreeBodyBuilder } from "./free-body-builder";
import { PushLab } from "./push-lab";
import { VectorAdd } from "./vector-add";

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
const tick = (name: string) =>
  fireEvent.click(screen.getByRole("checkbox", { name }));

/** Fills in the defaults the server would, as <Interactive> does. */
const props = <Id extends InteractiveId>(id: Id, given: object = {}) =>
  interactiveSpecs[id].props.parse(given) as InteractiveProps<Id>;

describe("VectorAdd", () => {
  it("adds a current to the rowing, and finds the heading that goes straight across", () => {
    const onGoal = vi.fn();
    const { container } = renderWithIntl(
      <VectorAdd
        {...props("vector-add", {
          a: { magnitude: 3, angle: 90 },
          b: { magnitude: 2, angle: 0 },
          lockB: true,
          labels: "boat",
          unit: "m/s",
          goal: { direction: 90 },
        })}
      />,
    );
    container.addEventListener("jabr:goal", onGoal);

    // Rowing straight across at 3 with a current of 2: √13 at 56°.
    expect(screen.getByTestId("vector-size")).toHaveTextContent("3.61 m/s");
    expect(screen.getByTestId("vector-direction")).toHaveTextContent("56°");
    expect(screen.getByTestId("vector-x")).toHaveTextContent("2 m/s");
    // The current cannot be changed.
    expect(screen.getAllByRole("slider")).toHaveLength(2);
    expect(onGoal).not.toHaveBeenCalled();

    setSlider(/Your rowing: direction/, 132);
    expect(screen.getByTestId("vector-direction")).toHaveTextContent("90°");
    expect(screen.getByTestId("vector-size")).toHaveTextContent("2.23 m/s");
    expect(
      screen.getByText(
        "Straight across, at 2.23 m/s. You had to aim at 132° to do it.",
      ),
    ).toBeVisible();
    expect(onGoal).toHaveBeenCalledTimes(1);
  });

  it("splits one vector into its parts", () => {
    renderWithIntl(
      <VectorAdd
        {...props("vector-add", {
          mode: "components",
          a: { magnitude: 4, angle: 30 },
          goal: { x: 3, y: -4 },
        })}
      />,
    );
    expect(screen.getByTestId("vector-x")).toHaveTextContent("3.46");
    expect(screen.getByTestId("vector-y")).toHaveTextContent("2");
    expect(
      screen.getByText(
        "Make a vector with a horizontal part of 3 and a vertical part of -4.",
      ),
    ).toBeVisible();

    setSlider(/A: size/, 5);
    setSlider(/A: direction/, 307);
    expect(screen.getByTestId("vector-x")).toHaveTextContent("3.01");
    expect(screen.getByTestId("vector-y")).toHaveTextContent("-3.99");
    expect(screen.getByText(/That's it\. Its size is 5/)).toBeVisible();
  });
});

describe("BrakingDistance", () => {
  it("keeps the answer back until the car has stopped", () => {
    renderWithIntl(<BrakingDistance {...props("braking-distance")} />);
    expect(screen.getByTestId("braking-status")).toHaveTextContent(
      "A tree has fallen across the road 60 m ahead.",
    );
    expect(screen.getByTestId("braking-stopping")).toHaveTextContent("–");

    // 50 km/h: 13.9 m thinking, 13.8 m braking.
    click("Brake!");
    expect(screen.getByTestId("braking-thinking")).toHaveTextContent("13.9 m");
    expect(screen.getByTestId("braking-braking")).toHaveTextContent("13.8 m");
    expect(screen.getByTestId("braking-stopping")).toHaveTextContent("27.7 m");
    expect(screen.getByTestId("braking-status")).toHaveTextContent(
      "Stopped, with 32.3 m to spare.",
    );
  });

  it("finds the fastest speed that still stops in time", () => {
    const onGoal = vi.fn();
    const { container } = renderWithIntl(
      <BrakingDistance {...props("braking-distance", { goal: true })} />,
    );
    container.addEventListener("jabr:goal", onGoal);

    setSlider(/Speed/, 85);
    click("Brake!");
    expect(screen.getByTestId("braking-status")).toHaveTextContent(
      "The car is still doing 25 km/h when it reaches the tree.",
    );
    expect(onGoal).not.toHaveBeenCalled();

    // Safe, but not the limit.
    setSlider(/Speed/, 60);
    click("Brake!");
    expect(screen.getByTestId("braking-status")).toHaveTextContent("Stopped");
    expect(onGoal).not.toHaveBeenCalled();

    setSlider(/Speed/, 80);
    expect(screen.getByTestId("braking-stopping")).toHaveTextContent("–");
    click("Brake!");
    expect(screen.getByText(/80 km\/h is the limit/)).toBeVisible();
    expect(onGoal).toHaveBeenCalledTimes(1);
  });

  it("needs much more room on ice", () => {
    renderWithIntl(<BrakingDistance {...props("braking-distance")} />);
    fireEvent.click(screen.getByRole("radio", { name: "Icy" }));
    click("Brake!");
    // 13.9 m thinking, then 13.89² ÷ (2 × 1.5) = 64.3 m of braking.
    expect(screen.getByTestId("braking-status")).toHaveTextContent("Too fast");
  });
});

describe("PushLab", () => {
  it("accelerates at force over mass, then keeps its speed on ice", () => {
    const onGoal = vi.fn();
    const { container } = renderWithIntl(
      <PushLab
        {...props("push-lab", { mass: 4, force: 6, goal: { speed: 6 } })}
      />,
    );
    container.addEventListener("jabr:goal", onGoal);
    expect(screen.getByTestId("push-acceleration")).toHaveTextContent(
      "1.5 m/s²",
    );
    expect(screen.getByTestId("push-released")).toHaveTextContent("–");

    click("Push");
    expect(screen.getByTestId("push-released")).toHaveTextContent("3 m/s");
    expect(screen.getByTestId("push-speed")).toHaveTextContent("3 m/s");
    expect(screen.getByText(/the block keeps its speed/)).toBeVisible();
    expect(onGoal).not.toHaveBeenCalled();

    setSlider(/Push force/, 12);
    expect(screen.getByTestId("push-acceleration")).toHaveTextContent("3 m/s²");
    click("Push");
    expect(screen.getByText(/There it is: 6 m\/s/)).toBeVisible();
    expect(onGoal).toHaveBeenCalledTimes(1);
  });

  it("slows to a stop on carpet, and does not budge under a weak push", () => {
    renderWithIntl(<PushLab {...props("push-lab", { mass: 4, force: 12 })} />);
    fireEvent.click(screen.getByRole("radio", { name: "Carpet" }));
    // (12 − 0.25 × 4 × 9.81) ÷ 4
    expect(screen.getByTestId("push-acceleration")).toHaveTextContent(
      "0.55 m/s²",
    );
    click("Push");
    expect(screen.getByTestId("push-speed")).toHaveTextContent("0 m/s");
    expect(screen.getByText(/friction is the only force/)).toBeVisible();

    setSlider(/Push force/, 5);
    click("Push");
    expect(screen.getByText(/too weak to beat friction/)).toBeVisible();
  });
});

describe("FreeBodyBuilder", () => {
  it("explains what is wrong, then shows the outcome of a right diagram", () => {
    const onGoal = vi.fn();
    const { container } = renderWithIntl(
      <FreeBodyBuilder situations={["book", "skydiver"]} />,
    );
    container.addEventListener("jabr:goal", onGoal);
    const feedback = () => screen.getByTestId("free-body-feedback");

    tick("Weight");
    tick("Force of motion");
    click("Check my diagram");
    expect(feedback()).toHaveTextContent("Force of motion does not belong.");
    expect(feedback()).toHaveTextContent("The book is not even moving.");
    expect(feedback()).toHaveTextContent("One force is missing.");
    expect(feedback()).toHaveTextContent("What stops it sinking in?");

    // Changing the choice clears the feedback until the next check.
    tick("Force of motion");
    expect(feedback()).toBeEmptyDOMElement();
    tick("Normal force");
    click("Check my diagram");
    expect(feedback()).toHaveTextContent("That is the complete diagram.");
    expect(feedback()).toHaveTextContent("the book stays at rest");
    // Balanced forces leave no net force to draw.
    expect(screen.queryByTestId("free-body-net")).not.toBeInTheDocument();
    expect(onGoal).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("radio", { name: "Skydiver" }));
    expect(feedback()).toBeEmptyDOMElement();
    tick("Weight");
    tick("Air drag");
    click("Check my diagram");
    expect(feedback()).toHaveTextContent("This is terminal velocity.");
    expect(onGoal).toHaveBeenCalledTimes(1);

    // Each situation remembers its own diagram.
    fireEvent.click(screen.getByRole("radio", { name: "Book" }));
    expect(
      screen.getByRole("checkbox", { name: "Normal force" }),
    ).toBeChecked();
  });

  it("draws the net force when the forces do not cancel", () => {
    renderWithIntl(<FreeBodyBuilder situations={["rocket"]} />);
    tick("Weight");
    tick("Thrust");
    click("Check my diagram");
    expect(screen.getByTestId("free-body-net")).toHaveTextContent("Net force");
  });
});
