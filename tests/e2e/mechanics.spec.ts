import { choose, expect, type Page, test } from "./fixtures";

const course = "/courses/classical-mechanics";
const lessons = {
  motion: `${course}/describing-motion/motion-in-one-dimension`,
  vectors: `${course}/describing-motion/vectors`,
  projectiles: `${course}/describing-motion/projectile-motion`,
  newton: `${course}/forces/newtons-laws`,
  diagrams: `${course}/forces/free-body-diagrams`,
  gravity: `${course}/forces/gravity-and-weight`,
  drag: `${course}/forces/drag`,
};

const interactive = (page: Page, id: string) =>
  page.locator(`[data-interactive="${id}"]`).filter({ visible: true });

test.describe("classical mechanics", () => {
  test("the course is in the catalog with its lessons", async ({ page }) => {
    await page.goto("/courses");
    await page.getByRole("link", { name: /Classical mechanics/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Classical mechanics",
    );
    await expect(
      page.getByRole("link", { name: /Free-body diagrams/ }),
    ).toBeVisible();
    // The third module is announced but not written.
    await expect(page.getByText("Energy and momentum")).toBeVisible();
    await expect(page.getByText("Coming soon").first()).toBeVisible();
  });

  test("every lesson is ready and fits the screen at each step", async ({
    page,
  }) => {
    test.slow();
    for (const url of Object.values(lessons)) {
      await page.goto(url);
      await expect(page.getByText("This lesson is being written")).toHaveCount(
        0,
      );
      const steps = await page
        .getByRole("button", { name: /^Step \d+ of \d+/ })
        .count();
      expect(steps, url).toBeGreaterThanOrEqual(4);
      for (let step = 1; step <= steps; step++) {
        await page.goto(`${url}#step-${step}`);
        await expect(
          page.getByRole("heading", { level: 2 }).filter({ visible: true }),
        ).toHaveCount(1);
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
        expect(overflow, `${url}#step-${step}`).toBeLessThanOrEqual(0);
      }
    }
  });

  test("the emergency stop finds the fastest safe speed", async ({ page }) => {
    await page.goto(lessons.motion);
    const sim = interactive(page, "braking-distance");
    const status = sim.getByTestId("braking-status");
    await expect(status).toContainText("Will you stop in time?");
    await expect(sim.getByTestId("braking-stopping")).toHaveText("– m");

    // From 50 km/h up to 80 km/h, in steps of 5.
    const speed = sim.getByRole("slider", { name: "Speed" });
    await speed.focus();
    for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowRight");
    await sim.getByRole("button", { name: "Brake!" }).click();
    // The stop takes a little over four seconds.
    await expect(status).toContainText("Stopped, with 2.5 m to spare.", {
      timeout: 12_000,
    });
    await expect(sim.getByTestId("braking-stopping")).toHaveText("57.5 m");
    await expect(sim.getByText(/80 km\/h is the limit/)).toBeVisible();
  });

  test("the boat is aimed upstream by dragging and by keyboard", async ({
    page,
  }) => {
    await page.goto(lessons.vectors);
    const bench = interactive(page, "vector-add").first();
    const direction = bench.getByTestId("vector-direction");
    await expect(direction).toHaveText("56°");

    // Drag the tip of the rowing arrow somewhere else on the grid.
    const plot = bench.getByTestId("vector-plot");
    await plot.scrollIntoViewIfNeeded();
    const box = (await plot.boundingBox())!;
    const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await page.mouse.move(centre.x, centre.y - box.height * 0.2);
    await page.mouse.down();
    await page.mouse.move(centre.x - box.width * 0.15, centre.y - 20, {
      steps: 8,
    });
    await page.mouse.up();
    await expect(direction).not.toHaveText("56°");

    // Then set the heading exactly from the keyboard.
    const heading = bench.getByRole("slider", {
      name: "Your rowing: direction",
    });
    await heading.fill("132");
    await bench.getByRole("slider", { name: "Your rowing: size" }).fill("3");
    await expect(direction).toHaveText("90°");
    await expect(
      bench.getByText(/Straight across, at 2.23 m\/s/),
    ).toBeVisible();
  });

  test("a push on ice gives a = F/m and then a steady speed", async ({
    page,
  }) => {
    await page.goto(lessons.newton);
    const lab = interactive(page, "push-lab");
    await expect(lab.getByTestId("push-acceleration")).toHaveText("1.5 m/s²");
    await lab.getByRole("slider", { name: "Push force" }).fill("12");
    await expect(lab.getByTestId("push-acceleration")).toHaveText("3 m/s²");

    await lab.getByRole("button", { name: "Push" }).click();
    // Two seconds of pushing, then three of coasting.
    await expect(lab.getByText(/There it is: 6 m\/s/)).toBeVisible({
      timeout: 12_000,
    });
    await expect(lab.getByTestId("push-speed")).toHaveText("6 m/s");
  });

  test("a free-body diagram is corrected, then completed", async ({ page }) => {
    await page.goto(lessons.diagrams);
    const builder = interactive(page, "free-body-builder");
    const feedback = builder.getByTestId("free-body-feedback");

    await choose(builder.getByRole("checkbox", { name: "Weight" }));
    await choose(builder.getByRole("checkbox", { name: "Friction" }));
    await builder.getByRole("button", { name: "Check my diagram" }).click();
    await expect(feedback).toContainText("Friction does not belong.");
    await expect(feedback).toContainText("One force is missing.");

    await builder.getByRole("checkbox", { name: "Friction" }).press("Space");
    await choose(builder.getByRole("checkbox", { name: "Normal force" }));
    await builder.getByRole("button", { name: "Check my diagram" }).click();
    await expect(feedback).toContainText("That is the complete diagram.");

    // A situation where the forces do not cancel shows the net force.
    await builder.getByText("Rocket", { exact: true }).click();
    await choose(builder.getByRole("checkbox", { name: "Weight" }));
    await choose(builder.getByRole("checkbox", { name: "Thrust" }));
    await builder.getByRole("button", { name: "Check my diagram" }).click();
    await expect(builder.getByTestId("free-body-net")).toBeVisible();
  });
});
