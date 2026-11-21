import { defineConfig, devices } from '@playwright/test';

/**
 * The demos' web build in Chromium: the components with real layout, real
 * hit testing and the browser's own input, which the unit tests' simulated
 * runtime does not have. `pnpm test:e2e` builds first (turbo.json).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? [['list'], ['github']] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node scripts/serve.ts 4173',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env['CI'],
  },
});
