import { test as base, Page, request } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { createTestUser } from '../helpers/auth';
import type { AuthResponse } from 'myhome-common/api/generated/model';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

const BACKEND_PORT = process.env.TEST_BACKEND_PORT ?? '8081';

export interface PageFixtures {
  /** Fresh test user credentials, created once per test */
  testAuth: AuthResponse & { email: string; password: string };
  /** Page pre-seeded with auth tokens in localStorage */
  authenticatedPage: Page;
}

export const test = base.extend<PageFixtures>({
  testAuth: async ({}, use, testInfo) => {
    const suffix = `${testInfo.workerIndex}-${Date.now()}`;
    const ctx = await request.newContext({
      baseURL: `http://localhost:${BACKEND_PORT}`,
    });
    const auth = await createTestUser(ctx, suffix);
    await ctx.dispose();
    await use(auth);
  },

  authenticatedPage: async ({ page, testAuth }, use) => {
    // Inject auth into localStorage in the Zustand persist format before the app boots.
    // The auth store uses persist({ name: 'auth-storage' }) so the key is 'auth-storage'
    // and the value is { state: { ...storeFields }, version: 0 }.
    await page.addInitScript(
      (authStorage: string) => {
        localStorage.setItem('auth-storage', authStorage);
      },
      JSON.stringify({
        state: {
          accessToken: testAuth.accessToken ?? '',
          refreshToken: testAuth.refreshToken ?? '',
          user: testAuth.user ?? null,
          isAuthenticated: true,
        },
        version: 0,
      }),
    );
    await use(page);
  },
});

export { expect } from '@playwright/test';
