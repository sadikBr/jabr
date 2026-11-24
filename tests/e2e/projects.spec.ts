import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, type Page, test } from "./fixtures";

const project = "/projects/rocket-flight-simulator";
// Milestones in order, with the code lab that checks each one.
const milestones = [
  {
    slug: "constant-velocity",
    title: "A point that moves",
    lab: "rocket.constant-velocity",
  },
  { slug: "gravity", title: "Add gravity", lab: "rocket.gravity" },
  {
    slug: "launch-angle",
    title: "Launch at an angle",
    lab: "rocket.launch-angle",
  },
  { slug: "thrust", title: "Light the engine", lab: "rocket.thrust" },
  { slug: "drag", title: "Add the air", lab: "rocket.drag" },
  {
    slug: "target-altitude",
    title: "Hit a target altitude",
    lab: "rocket.target-altitude",
  },
] as const;

/** The reference solution, which lives in a test fixture and never ships. */
const solution = (lab: string) =>
  readFileSync(
    path.join(process.cwd(), "tests/fixtures/solutions", `${lab}.py`),
    "utf8",
  );

async function writeCode(page: Page, lab: string, code: string) {
  const editor = page.locator(`[data-codelab="${lab}"] .cm-content`);
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.insertText(code);
}

test.describe("projects", () => {
  test("the project page lays out the milestones and where to start", async ({
    page,
  }) => {
    await page.goto("/projects");
    await page.getByRole("link", { name: "Open the project" }).click();
    await expect(page).toHaveURL(project);
    // Next.js keeps the page just left in the document, hidden, so that going
    // back is instant. Load the project page afresh so only it is there.
    await page.goto(project);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Rocket flight simulator",
    );
    await expect(
      page.getByText("6 milestones", { exact: true }).first(),
    ).toBeVisible();
    for (const { title } of milestones) {
      await expect(
        page.getByRole("link", { name: new RegExp(title) }).first(),
      ).toBeVisible();
    }
    const start = page.getByTestId("project-continue");
    await expect(start).toContainText("Start here");
    await expect(start).toContainText("A point that moves");
    await expect(page.getByTestId("project-readiness")).toContainText(
      "Ready for 0%",
    );

    await start.click();
    await expect(page).toHaveURL(`${project}/constant-velocity`);
    await expect(
      page.getByText("Milestone 1 of 6").filter({ visible: true }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "A point that moves",
    );
  });

  test("a milestone page fits a phone, and later milestones are open but say what they build on", async ({
    page,
  }) => {
    await page.goto(`${project}/drag`);
    await expect(
      page.getByText("This milestone builds on the one before it"),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Light the engine" }).first(),
    ).toBeVisible();
    // The instructions come with something to play with.
    await expect(page.locator('[data-interactive="drop-test"]')).toBeVisible();
    await expect(
      page.locator('[data-codelab="rocket.drag"] .cm-content'),
    ).toContainText("drag_force = 0.0");
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("unknown projects and milestones show the not-found page", async ({
    page,
  }) => {
    for (const url of [
      "/projects/nope",
      `${project}/nope`,
      "/projects/tangent-line-explorer",
    ]) {
      await page.goto(url);
      await expect(
        page.getByRole("heading", { name: "Page not found" }),
        url,
      ).toBeVisible();
    }
  });
});

test.describe("the rocket capstone", () => {
  // Six runs of Python, the last one with a plot.
  test.setTimeout(240_000);

  test("can be completed from the first milestone to the last", async ({
    page,
  }) => {
    for (const [index, { slug, title, lab }] of milestones.entries()) {
      await page.goto(`${project}/${slug}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
      const panel = page.locator(`[data-codelab="${lab}"]`);
      const run = panel.getByRole("button", { name: "Run and check" });

      if (index === 0) {
        // The starter code runs but does not pass.
        await run.click();
        // (One check passes already: the list does start at zero.)
        await expect(panel.getByText("1 of 4 checks passed")).toBeVisible({
          timeout: 120_000,
        });
        await expect(
          panel.getByText(/Four steps should give five positions/),
        ).toBeVisible();
        await expect(page.getByTestId("milestone-passed")).toHaveCount(0);
      }

      await writeCode(page, lab, solution(lab));
      await run.click();
      await expect(
        panel.getByText("All checks passed. Nice work!"),
      ).toBeVisible({ timeout: 150_000 });

      const passed = page.getByTestId("milestone-passed");
      const last = index === milestones.length - 1;
      await expect(passed).toContainText(
        last ? "Project complete!" : "Milestone passed!",
      );
      if (!last) {
        await expect(
          passed.getByRole("link", {
            name: new RegExp(milestones[index + 1]!.title),
          }),
        ).toBeVisible();
      } else {
        // The tuned flight is plotted.
        await expect(panel.getByTestId("codelab-output")).toContainText(
          "To reach 400 m, load 0.674 kg of fuel.",
        );
        await expect(panel.getByRole("img", { name: /Plot 1/ })).toBeVisible();
      }
    }

    // The project knows it is finished, and so does the progress page.
    await page.goto(project);
    await expect(page.getByTestId("project-complete")).toBeVisible();
    await expect(page.getByText("6 of 6 milestones passed")).toBeVisible();
    await expect(page.locator('[data-milestone-state="passed"]')).toHaveCount(
      6,
    );

    await page.goto("/dashboard");
    await expect(
      page.getByText("Completed the project Rocket flight simulator"),
    ).toBeVisible();
    await expect(
      page.getByText("Passed the milestone “Hit a target altitude”"),
    ).toBeVisible();
    // Passing the labs counted towards the concepts they practise.
    await expect(
      page
        .getByRole("main")
        .getByRole("link", { name: /Euler's method/ })
        .first(),
    ).not.toHaveAttribute("data-mastery", "new");
  });

  test("progress through the milestones is kept and picked up again", async ({
    page,
  }) => {
    const [first, second] = milestones;
    await page.goto(`${project}/${first.slug}`);
    await writeCode(page, first.lab, solution(first.lab));
    await page
      .locator(`[data-codelab="${first.lab}"]`)
      .getByRole("button", { name: "Run and check" })
      .click();
    await expect(page.getByTestId("milestone-passed")).toBeVisible({
      timeout: 150_000,
    });

    // The passed state, and the code, survive a reload.
    await page.reload();
    await expect(page.getByTestId("milestone-passed")).toBeVisible();
    await expect(
      page.locator(`[data-codelab="${first.lab}"] .cm-content`),
    ).toContainText("x += v * dt");

    await page.goto(project);
    await expect(page.getByText("1 of 6 milestones passed")).toBeVisible();
    const next = page.getByTestId("project-continue");
    await expect(next).toContainText("Continue");
    await expect(next).toContainText("Milestone 2 of 6");
    await next.click();
    await expect(page).toHaveURL(`${project}/${second.slug}`);
    await expect(
      page.getByText("This milestone builds on the one before it"),
    ).toHaveCount(0);

    await page.goto("/projects");
    await expect(page.getByTestId("project-progress")).toContainText(
      "1 of 6 milestones passed",
    );
  });
});
