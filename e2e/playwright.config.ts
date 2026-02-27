import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.test') });

const BACKEND_PORT = process.env.TEST_BACKEND_PORT ?? '8081';
const VITE_PORT = process.env.TEST_VITE_PORT ?? '5174';

export default defineConfig({
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',

  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 10_000 },

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: `http://localhost:${BACKEND_PORT}`,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'api',
      testDir: './tests/api',
      // No browser — pure HTTP via APIRequestContext
    },
    {
      name: 'ui',
      testDir: './tests/ui',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${VITE_PORT}`,
      },
    },
  ],
});
