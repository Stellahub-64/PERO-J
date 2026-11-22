import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "*.test.js",
  /* Each test gets 120s – plenty for the sandbox, indexer, and frontend. */
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  /* The webServer config starts the full stack before any test runs */
  webServer: [
    {
      command:
        "docker compose -f docker-compose.e2e.yml up -d --wait",
      port: 5173,
      timeout: 180_000,
      reuseExistingServer: true,
      cwd: new URL(".", import.meta.url).pathname,
      environment: {
        DOCKER_BUILDKIT: "1",
        COMPOSE_DOCKER_CLI_BUILD: "1",
      },
    },
  ],
  use: {
    baseURL: process.env.FRONTEND_URL || "http://localhost:5173",
    headless: true,
    screenshot: "only-on-failure",
  },
});
