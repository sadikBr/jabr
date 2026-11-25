import { expect, type Page, test } from "./fixtures";

const orbit = "/explore/how-does-a-rocket-reach-orbit";
const games = "/explore/how-do-video-games-simulate-physics";

const interactive = (page: Page, id: string) =>
  page.locator(`[data-interactive="${id}"]`).filter({ visible: true });

async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow, page.url()).toBeLessThanOrEqual(0);
}

test.describe("explainers", () => {
  for (const [name, url] of [
    ["rocket to orbit", orbit],
    ["video game physics", games],
  ] as const) {
    test(`${name}: opens on the intuition and goes all the way down`, async ({
      page,
    }) => {
      await page.goto(url);
      await expect(
        page.getByText("This explainer is being written"),
      ).toHaveCount(0);
      await expect(page.locator("[data-interactive]").first()).toBeVisible();
      await expectNoSidewaysScroll(page);

      // Three more layers lie under the first: mechanism, maths, build.
      const deeper = page.getByRole("button", { name: /Go deeper/ });
      for (const heading of ["Mechanism", "Maths & science", "Build it"]) {
        await deeper.click();
        await expect(
          page.getByRole("heading", { name: heading }),
        ).toBeVisible();
        await expectNoSidewaysScroll(page);
      }
      await expect(page.getByText(/reached the bottom/)).toBeVisible();
      await expect(page.locator("[data-codelab]").first()).toBeVisible();
    });
  }

  test("the cannonball falls short, then reaches orbit", async ({ page }) => {
    await page.goto(orbit);
    const cannon = interactive(page, "orbit-cannon");
    const status = cannon.getByTestId("orbit-status");
    await expect(status).toContainText("The cannon is 400 km up");

    await cannon.getByRole("button", { name: "Fire" }).click();
    // The flight is played back over a few seconds.
    await expect(status).toContainText("It falls back to Earth", {
      timeout: 12_000,
    });

    await cannon.getByRole("slider", { name: "Launch speed" }).fill("7.7");
    await cannon.getByRole("button", { name: "Fire" }).click();
    await expect(status).toContainText("An orbit. It circles", {
      timeout: 12_000,
    });
    await expect(cannon.getByTestId("orbit-period")).toHaveText("93 min");
    await expect(
      cannon.getByText(/In orbit\. It is still falling/),
    ).toBeVisible();
  });

  test("the game is broken with a low frame rate", async ({ page }) => {
    await page.goto(games);
    const game = interactive(page, "game-loop").first();
    await expect(game.getByTestId("game-stride")).toHaveText("16 cm");

    await game.getByText("10", { exact: true }).click();
    await expect(game.getByTestId("game-stride")).toHaveText("99 cm");
    await game.getByRole("button", { name: "Drop the ball" }).click();
    await expect(game.getByTestId("game-status")).toContainText(
      "The game never saw them touch.",
      { timeout: 12_000 },
    );
    await expect(game.getByText(/^Broken\./)).toBeVisible();
  });
});

test.describe("mini projects", () => {
  for (const [id, title, milestones] of [
    ["tangent-line-explorer", "Tangent line explorer", 4],
    ["hit-the-target", "Hit the target", 3],
  ] as const) {
    test(`${title}: every milestone opens with its lab and fits a phone`, async ({
      page,
    }) => {
      await page.goto(`/projects/${id}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
      const links = page
        .getByRole("main")
        .locator(`a[href^="/projects/${id}/"]`);
      const hrefs = [
        ...new Set(
          await links.evaluateAll((anchors) =>
            anchors.map((anchor) => anchor.getAttribute("href")!),
          ),
        ),
      ];
      expect(hrefs).toHaveLength(milestones);
      await expectNoSidewaysScroll(page);

      for (const href of hrefs) {
        await page.goto(href);
        await expect(page.locator("[data-codelab] .cm-content")).toBeVisible();
        await expectNoSidewaysScroll(page);
      }
    });
  }
});
