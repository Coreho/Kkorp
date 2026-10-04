import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests for the Next.js application.
 *
 * Separate from playwright.config.js because the prototype and the application
 * are served by different servers on different ports, and the prototype is
 * still the production rollback target with its own suite.
 */
const port = Number(process.env.APP_PORT ?? 4180);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests/app',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never' }]]
    : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: { mode: 'only-on-failure', fullPage: true },
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'app-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `node .next/standalone/server.js`,
    url: `${baseURL}/api/health`,
    env: { PORT: String(port), HOSTNAME: '127.0.0.1' },
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});