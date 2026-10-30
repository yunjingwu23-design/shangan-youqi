import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.e2e.ts',
  workers: 1,
  retries: 0,
  timeout: 45000,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || '/usr/bin/chromium',
      args: ['--no-sandbox'],
    },
    screenshot: 'only-on-failure',
  },
  reporter: [['list'], ['html', { open: 'never' }]],
});
