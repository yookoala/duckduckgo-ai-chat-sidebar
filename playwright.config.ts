import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  // Each test gets 30 s; Test 3 (duck.ai load) needs the most time.
  timeout: 30_000,
  // Retry once in CI to tolerate transient network latency on Test 3.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  projects: [
    {
      name: "firefox",
      // No use.browserName needed — the spec file creates the browser
      // manually via playwright-webextext. This project entry is kept
      // minimal so Playwright's test runner discovers and runs the spec.
    },
  ],
});
