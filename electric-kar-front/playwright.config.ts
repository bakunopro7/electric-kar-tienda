import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config for the SSR storefront.
 *
 * Spins up BOTH servers the storefront needs:
 *  - NestJS backend on :3000 (../electric-kar)
 *  - Angular SSR server on :4200 (this app's production build)
 *
 * Servers are reused if already running locally (`reuseExistingServer`), so
 * during development you can keep them up and tests start instantly.
 */
const PNPM = `PATH="${process.env['HOME']}/.local/bin:$PATH" pnpm`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: 1,
  reporter: process.env['CI'] ? 'list' : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: [
    {
      // Backend API. Builds first so a clean checkout still works.
      command: `${PNPM} build && node dist/main`,
      cwd: '../electric-kar',
      url: 'http://localhost:3000/api/products',
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
      stdout: 'pipe',
    },
    {
      // Angular SSR production server.
      command: `${PNPM} build && node dist/electric-kar-front/server/server.mjs`,
      cwd: '.',
      url: 'http://localhost:4200',
      reuseExistingServer: !process.env['CI'],
      timeout: 180_000,
      stdout: 'pipe',
    },
  ],
});
