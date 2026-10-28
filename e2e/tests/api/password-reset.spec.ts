import { test, expect } from '../../fixtures/api.fixture';
import { createTestUser, loginAs } from '../../helpers/auth';
import { request, type APIRequestContext } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

const BACKEND_PORT = process.env.TEST_BACKEND_PORT ?? '8081';
const OLD_PASSWORD = 'Password123!';
const NEW_PASSWORD = 'BrandNewPass456!';

async function addChild(adminApi: APIRequestContext): Promise<{ userId: number; email: string }> {
  const email = `reset-child-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  const res = await adminApi.post('/api/family/members', {
    data: { email, password: OLD_PASSWORD, displayName: 'Reset Child', role: 'CHILD' },
  });
  expect(res.ok()).toBeTruthy();
  const { userId } = (await res.json()) as { userId: number };
  return { userId, email };
}

function apiWithToken(accessToken: string): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: `http://localhost:${BACKEND_PORT}`,
    extraHTTPHeaders: { Authorization: `Bearer ${accessToken}` },
  });
}

test.describe('Family member password reset API', () => {
  test('admin resets a child password: new one works, old one and old sessions do not', async ({ api, authApi }) => {
    const child = await addChild(authApi);
    const session = await loginAs(api, { email: child.email, password: OLD_PASSWORD });

    const res = await authApi.put(`/api/family/members/${child.userId}/password`, {
      data: { newPassword: NEW_PASSWORD },
    });
    expect(res.status()).toBe(200);

    const oldLogin = await api.post('/api/auth/login', { data: { email: child.email, password: OLD_PASSWORD } });
    expect(oldLogin.status()).toBe(401);

    const newLogin = await loginAs(api, { email: child.email, password: NEW_PASSWORD });
    expect(newLogin.accessToken).toBeTruthy();

    // The refresh token from before the reset was revoked
    const refresh = await api.post('/api/auth/refresh', { data: { refreshToken: session.refreshToken } });
    expect(refresh.status()).toBe(401);
  });

  test('a password shorter than 8 characters is rejected', async ({ authApi }) => {
    const child = await addChild(authApi);
    const res = await authApi.put(`/api/family/members/${child.userId}/password`, {
      data: { newPassword: 'short' },
    });
    expect(res.status()).toBe(400);
  });

  test('a non-admin cannot reset passwords', async ({ api, authApi }) => {
    const child = await addChild(authApi);
    const other = await addChild(authApi);
    const childAuth = await loginAs(api, { email: child.email, password: OLD_PASSWORD });
    const childApi = await apiWithToken(childAuth.accessToken!);

    const res = await childApi.put(`/api/family/members/${other.userId}/password`, {
      data: { newPassword: NEW_PASSWORD },
    });
    expect(res.status()).toBe(403);
    await childApi.dispose();
  });

  test('a member of another family is not found', async ({ api, authApi }) => {
    const stranger = await createTestUser(api, `reset-stranger-${Date.now()}`);

    const res = await authApi.put(`/api/family/members/${stranger.user!.id}/password`, {
      data: { newPassword: NEW_PASSWORD },
    });
    expect(res.status()).toBe(404);
    expect(((await res.json()) as { message?: string }).message).toBe('Family member not found');

    // ...and the stranger's password is untouched
    const login = await api.post('/api/auth/login', { data: { email: stranger.email, password: stranger.password } });
    expect(login.status()).toBe(200);
  });

  test('requires authentication', async ({ api }) => {
    const res = await api.put('/api/family/members/1/password', { data: { newPassword: NEW_PASSWORD } });
    expect(res.status()).toBe(401);
  });
});
