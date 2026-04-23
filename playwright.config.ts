import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  use: {
    baseURL: 'http://localhost:4321/the-model-archive/',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run preview -- --port 4321',
    url: 'http://localhost:4321/the-model-archive',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
});
