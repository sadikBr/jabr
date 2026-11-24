import { expect, type Page, test } from "./fixtures";

const lesson = "/courses/calculus-essentials/derivatives/what-is-a-derivative";

const question = (page: Page, id: string) =>
  page.locator(`[data-question="${id}"]`);

async function answerChoice(page: Page, id: string, indexes: number[]) {
  const card = question(page, id);
  // By role, so this waits until the step holding the question is showing.
  const options = card.getByRole("radio").or(card.getByRole("checkbox"));
  for (const index of indexes) {
    await options.nth(index).check({ force: true });
  }
  await card.getByRole("button", { name: /^Check/ }).click();
  await expect(card.getByText(/Correct/)).toBeVisible();
  return card;
}

test.describe("progress on this device", () => {
  test("starts empty and says where to begin", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Your progress",
    );
    await expect(page.getByText("Nothing here yet")).toBeVisible();
    await page.getByRole("link", { name: "Start the first lesson" }).click();
    await expect(page).toHaveURL(lesson);
  });

  test("answers build mastery, and it shows on chips, the concept page and the dashboard", async ({
    page,
  }) => {
    await page.goto(`${lesson}#step-2`);
    // Before: the concept this lesson teaches has not been started.
    const chip = page
      .getByRole("link", { name: /The derivative as a rate of change/ })
      .first();
    await expect(chip).toHaveAttribute("data-mastery", "new");

    const card = await answerChoice(page, "calc.deriv.shrinking-h", [0]);
    await expect(card.getByTestId("mastery-changes")).toContainText(
      "The derivative as a rate of change",
    );
    await expect(card.getByTestId("mastery-changes")).toContainText(
      "Practicing",
    );
    await expect(chip).toHaveAttribute("data-mastery", "practicing");

    // It survives a reload, and the question remembers it was solved.
    await page.reload();
    await expect(chip).toHaveAttribute("data-mastery", "practicing");
    await expect(
      question(page, "calc.deriv.shrinking-h").getByText("Solved"),
    ).toBeVisible();

    await page.goto("/concepts/derivative-definition");
    const meter = page.getByTestId("mastery-meter");
    await expect(meter).toContainText("Practicing");
    await expect(meter.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "30",
    );

    await page.goto("/dashboard");
    await expect(page.getByTestId("stat-practicing")).toContainText("2");
    await expect(page.getByTestId("stat-solved")).toContainText("1");
    await expect(
      page.getByRole("main").getByRole("link", { name: /Limits, intuitively/ }),
    ).toHaveAttribute("data-mastery", "practicing");
  });

  test("a wrong answer and a revealed solution count against the concept", async ({
    page,
  }) => {
    await page.goto(`${lesson}#step-2`);
    await answerChoice(page, "calc.deriv.shrinking-h", [0]);

    const card = question(page, "calc.deriv.definition-expression");
    await card.getByRole("textbox").fill("3x");
    await card.getByRole("button", { name: "Check" }).click();
    await expect(card.getByText(/Not quite/)).toBeVisible();
    await card.getByRole("button", { name: "Show the solution" }).click();
    await expect(card.getByText("Answer:")).toBeVisible();

    // 0.3 after the first correct answer, then two losses of 15% and 7.5%.
    await page.goto("/concepts/derivative-definition");
    await expect(
      page.getByTestId("mastery-meter").getByRole("progressbar"),
    ).toHaveAttribute("aria-valuenow", "24");
    await expect(page.getByTestId("mastery-meter")).toContainText("Learning");
  });

  test("a lesson is resumed, finished, and shown as finished everywhere", async ({
    page,
  }) => {
    await page.goto(lesson);
    // Retried: a click can land before the page's scripts have attached.
    await expect(async () => {
      await page.getByRole("button", { name: /Step 3 of 4/ }).click();
      await expect(page.getByRole("heading", { level: 2 })).toHaveText(
        "Make sure it stuck",
        { timeout: 1000 },
      );
    }).toPass();

    // The course and the home page both offer to pick it up at step 3.
    await page.goto("/courses/calculus-essentials");
    await expect(page.locator('[data-lesson-state="started"]')).toHaveCount(1);
    await expect(page.getByText("In progress")).toBeVisible();
    await page.goto("/");
    const resume = page.getByTestId("continue-card");
    await expect(resume).toContainText("Pick up where you left off");
    await expect(resume).toContainText("Step 3 of 4");
    await resume.click();
    await expect(
      page.getByText("Welcome back. You're on step 3."),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(
      "Make sure it stuck",
    );

    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Finish lesson" }).click();
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(
      "That's the lesson!",
    );

    await page.goto("/courses/calculus-essentials");
    await expect(page.locator('[data-lesson-state="completed"]')).toHaveCount(
      1,
    );
    await expect(page.getByText("1 of 1 lessons finished")).toBeVisible();

    await page.goto("/dashboard");
    await expect(page.getByTestId("stat-lessons")).toContainText("1");
    await expect(
      page.getByText("Finished What is a derivative?"),
    ).toBeVisible();
    await expect(page.getByText("Today")).toBeVisible();

    // A finished lesson opens at the start again, not at the end.
    await page.goto(lesson);
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(
      "Zoom in until it's straight",
    );
  });

  test("reaching a simulation's goal is recorded", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const sim = page.locator('[data-interactive="projectile-sim"]');
    // Retried as a whole: input before the page's scripts attach is lost.
    await expect(async () => {
      await sim.getByRole("slider", { name: /Launch speed/ }).fill("25");
      await sim.getByRole("slider", { name: /Launch angle/ }).fill("38");
      await sim.getByRole("button", { name: "Launch" }).click();
      await expect(sim.getByTestId("projectile-status")).toContainText(
        "Bullseye",
        { timeout: 1000 },
      );
    }).toPass();

    await page.goto("/dashboard");
    await expect(
      page.getByText("Reached the goal in Projectile launcher"),
    ).toBeVisible();
  });

  test("progress can be exported, erased and imported again", async ({
    page,
  }) => {
    await page.goto(`${lesson}#step-2`);
    await answerChoice(page, "calc.deriv.shrinking-h", [0]);
    await page.goto("/dashboard");
    await expect(page.getByTestId("stat-solved")).toContainText("1");

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export" }).click();
    const file = await (await download).path();
    expect((await download).suggestedFilename()).toMatch(
      /^jabr-progress-\d{4}-\d{2}-\d{2}\.json$/,
    );

    await page.getByRole("button", { name: "Reset progress" }).click();
    await page
      .getByRole("button", { name: "Really erase everything?" })
      .click();
    await expect(page.getByText("Nothing here yet")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Nothing here yet")).toBeVisible();

    await page.getByLabel("Import").setInputFiles(file);
    await expect(page.getByText("Progress imported.")).toBeVisible();
    await expect(page.getByTestId("stat-solved")).toContainText("1");

    // A file that is not a progress export is refused and changes nothing.
    await page.getByLabel("Import").setInputFiles({
      name: "notes.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"hello":"world"}'),
    });
    await expect(
      page.getByText("That file isn't a Jabr progress export."),
    ).toBeVisible();
    await expect(page.getByTestId("stat-solved")).toContainText("1");
  });

  test("the dashboard fits a phone without scrolling sideways", async ({
    page,
  }) => {
    await page.goto(`${lesson}#step-2`);
    await answerChoice(page, "calc.deriv.shrinking-h", [0]);
    await page.goto("/dashboard");
    await expect(page.getByTestId("stat-solved")).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
