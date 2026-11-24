import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3100);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    // Optional: use a system Chromium instead of Playwright's download.
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // Chromium with a 375px-wide phone profile; every page must work here.
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], viewport: { width: 375, height: 740 } },
    },
  ],
  // Tests run against the production build: it is what users get, and the
  // only mode where prerendering and the manifest behave as deployed.
  webServer: {
    command: `bun run build && bun run start -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
