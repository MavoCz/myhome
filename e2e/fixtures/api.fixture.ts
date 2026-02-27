import { test as base, APIRequestContext, request } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { createTestUser } from '../helpers/auth';
import type { AuthResponse } from 'myhome-common/api/generated/model';

dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

const BACKEND_PORT = process.env.TEST_BACKEND_PORT ?? '8081';
const BASE_URL = `http://localhost:${BACKEND_PORT}`;

export interface ApiFixtures {
  /** Unauthenticated APIRequestContext pointed at the test backend */
  api: APIRequestContext;
  /** Authenticated APIRequestContext (auto-creates a fresh test user per test) */
  authApi: APIRequestContext;
  /** The auth response for the `authApi` user */
  authResponse: AuthResponse & { email: string; password: string };
}

export const test = base.extend<ApiFixtures>({
  api: async ({}, use) => {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    await use(ctx);
    await ctx.dispose();
  },

  authApi: async ({ api }, use, testInfo) => {
    const suffix = `${testInfo.workerIndex}-${Date.now()}`;
    const auth = await createTestUser(api, suffix);

    const ctx = await request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: {
        Authorization: `Bearer ${auth.accessToken ?? ''}`,
      },
    });

    await use(ctx);
    await ctx.dispose();
  },

  authResponse: async ({ api }, use, testInfo) => {
    const suffix = `${testInfo.workerIndex}-${Date.now()}`;
    const auth = await createTestUser(api, suffix);
    await use(auth);
  },
});

export { expect } from '@playwright/test';
