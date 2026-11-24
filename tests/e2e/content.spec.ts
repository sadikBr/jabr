import { expect, test } from "@playwright/test";

const lesson = "/courses/calculus-essentials/derivatives/what-is-a-derivative";
const explainer =
  "/explore/why-do-a-hammer-and-a-feather-fall-at-the-same-rate";

async function expectNoSidewaysScroll(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow, page.url()).toBeLessThanOrEqual(0);
}

test("course catalog leads to a course and on to a lesson", async ({
  page,
}) => {
  await page.goto("/courses");
  await page.getByRole("link", { name: /Calculus essentials/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Calculus essentials",
  );
  await expect(page.getByText("Coming soon").first()).toBeVisible();
  await expectNoSidewaysScroll(page);

  await page.getByRole("link", { name: /Start with/ }).click();
  await expect(page).toHaveURL(lesson);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "What is a derivative?",
  );
});

test("a lesson can be read step by step to the end", async ({ page }) => {
  await page.goto(lesson);
  const stepHeading = page.getByRole("heading", { level: 2 });
  await expect(stepHeading).toHaveText("Zoom in until it's straight");

  // Maths and the interactive render in the first step.
  await expect(page.locator(".katex").first()).toBeVisible();
  const slope = page.getByTestId("secant-slope");
  await expect(slope).toHaveText("3");
  await page.getByRole("button", { name: "Zoom in ×10" }).click();
  await expect(slope).toHaveText("2.1");
  await expectNoSidewaysScroll(page);

  // The worked example opens on demand.
  const working = page.getByText("to get the average rate of change");
  await expect(working).toBeHidden();
  await page.getByText("The derivative of x² from the definition").click();
  await expect(working).toBeVisible();

  await page.getByRole("button", { name: "Continue" }).click();
  await expect(stepHeading).toHaveText("Find some slopes yourself");
  await expect(page).toHaveURL(/#step-2$/);
  await expect(page.locator("[data-question]").first()).toBeVisible();
  await expectNoSidewaysScroll(page);

  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(stepHeading).toHaveText("Where this goes next");
  await expect(page.getByRole("link", { name: "Velocity" })).toBeVisible();

  await page.getByRole("button", { name: "Finish lesson" }).click();
  await expect(stepHeading).toHaveText("That's the lesson!");
  await expect(
    page.getByRole("link", { name: "Back to the course" }),
  ).toBeVisible();
});

test("a lesson reopens on the step in the URL", async ({ page }) => {
  await page.goto(`${lesson}#step-3`);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(
    "Make sure it stuck",
  );
});

test("a coming-soon lesson says so and shows what it will cover", async ({
  page,
}) => {
  await page.goto(
    "/courses/calculus-essentials/numerical-methods/eulers-method",
  );
  await expect(page.getByText("This lesson is being written")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Euler's method" }),
  ).toBeVisible();
});

test("explore filters by subject and opens an explainer", async ({ page }) => {
  await page.goto("/explore");
  const cards = page.getByRole("main").getByRole("listitem");
  await expect(cards).toHaveCount(5);
  await page.getByRole("button", { name: "Maths" }).click();
  await expect(cards).toHaveCount(1);
  await page.getByRole("button", { name: "All" }).click();
  await expectNoSidewaysScroll(page);

  await page.getByRole("link", { name: /hammer and a feather/ }).click();
  await expect(page).toHaveURL(explainer);
});

test("an explainer goes deeper one layer at a time", async ({ page }) => {
  await page.goto(explainer);
  await expect(page.getByRole("heading", { name: "Intuition" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mechanism" })).toBeHidden();

  await page.getByRole("button", { name: /Go deeper/ }).click();
  await expect(page.getByRole("heading", { name: "Mechanism" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Intuition" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "1.32 kg" })).toBeVisible();
  await expectNoSidewaysScroll(page);

  // Jump straight to the bottom from the gauge: the code lab is there.
  await page
    .getByRole("navigation", { name: /How deep/ })
    .getByRole("button", { name: "Build it" })
    .click();
  await expect(page.getByRole("heading", { name: "Build it" })).toBeVisible();
  await expect(
    page.locator('[data-codelab="fall.sim"] .cm-content'),
  ).toContainText("def fall_time");
  await expect(page.getByText(/reached the bottom/)).toBeVisible();
  await expectNoSidewaysScroll(page);
});

test("a concept page shows its place in the graph", async ({ page }) => {
  await page.goto("/concepts/derivative-definition");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "The derivative as a rate of change",
  );
  const main = page.getByRole("main");
  await expect(
    main.getByRole("link", { name: "Limits, intuitively" }),
  ).toBeVisible();
  await expect(main.getByRole("link", { name: "Power rule" })).toBeVisible();
  await main.getByRole("link", { name: /What is a derivative\?/ }).click();
  await expect(page).toHaveURL(lesson);
});

test("unknown content shows the not-found page", async ({ page }) => {
  for (const path of [
    "/courses/nope",
    "/courses/calculus-essentials/derivatives/nope",
    "/explore/nope",
    "/concepts/nope",
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "Page not found" }),
      path,
    ).toBeVisible();
  }
});

test("projects lists the planned builds", async ({ page }) => {
  await page.goto("/projects");
  await expect(
    page.getByRole("heading", { name: "Rocket flight simulator" }),
  ).toBeVisible();
  await expectNoSidewaysScroll(page);
});
