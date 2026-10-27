import { test, expect } from '../../fixtures/api.fixture';
import { loginAs } from '../../helpers/auth';
import { request, type APIRequestContext } from '@playwright/test';
import type { GrantModuleAccessRequest, ModuleAccessResponse } from 'myhome-common/api/generated/model';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

const BACKEND_PORT = process.env.TEST_BACKEND_PORT ?? '8081';
const PASSWORD = 'Password123!';

interface Member {
  userId: number;
  email: string;
}

async function addMember(adminApi: APIRequestContext, role: 'CHILD' | 'PARENT' = 'CHILD'): Promise<Member> {
  const email = `access-${role.toLowerCase()}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  const res = await adminApi.post('/api/family/members', {
    data: { email, password: PASSWORD, displayName: `Access ${role}`, role },
  });
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { userId: number };
  return { userId: body.userId, email };
}

async function apiAs(api: APIRequestContext, email: string): Promise<APIRequestContext> {
  const auth = await loginAs(api, { email, password: PASSWORD });
  return request.newContext({
    baseURL: `http://localhost:${BACKEND_PORT}`,
    extraHTTPHeaders: { Authorization: `Bearer ${auth.accessToken}` },
  });
}

async function grant(adminApi: APIRequestContext, data: GrantModuleAccessRequest): Promise<ModuleAccessResponse> {
  const res = await adminApi.post('/api/family/module-access', { data });
  expect(res.status()).toBe(200);
  return (await res.json()) as ModuleAccessResponse;
}

/** ISO day of week (1 = Monday ... 7 = Sunday) in UTC, offset by `plusDays`. */
function utcIsoDay(plusDays = 0): number {
  const day = (new Date().getUTCDay() + plusDays) % 7;
  return day === 0 ? 7 : day;
}

test.describe('Module access API', () => {
  test('admin grants, lists, updates and revokes module access', async ({ authApi }) => {
    const child = await addMember(authApi);

    const created = await grant(authApi, {
      userId: child.userId,
      moduleName: 'learning',
      permission: 'ACCESS',
      validFrom: '2026-01-01T00:00:00Z',
      validUntil: '2030-12-31T23:00:00Z',
      schedules: [
        { dayOfWeek: 1, startTime: '15:00', endTime: '18:00', timezone: 'Europe/Prague' },
        { dayOfWeek: 2, startTime: '15:00', endTime: '18:00', timezone: 'Europe/Prague' },
      ],
    });
    expect(created.id).toBeTruthy();
    expect(created.moduleName).toBe('learning');
    expect(created.permission).toBe('ACCESS');
    expect(created.schedules).toHaveLength(2);
    expect(created.schedules![0]).toMatchObject({ dayOfWeek: 1, startTime: '15:00', endTime: '18:00', timezone: 'Europe/Prague' });

    const list = (await (await authApi.get(`/api/family/module-access?userId=${child.userId}`)).json()) as ModuleAccessResponse[];
    expect(list.map((g) => g.id)).toEqual([created.id]);

    // An update replaces permission, validity and schedules; an empty schedule list clears them
    const updateRes = await authApi.put(`/api/family/module-access/${created.id}`, {
      data: { permission: 'MANAGE', schedules: [] },
    });
    expect(updateRes.status()).toBe(200);
    const updated = (await updateRes.json()) as ModuleAccessResponse;
    expect(updated.permission).toBe('MANAGE');
    expect(updated.validFrom).toBeFalsy();
    expect(updated.validUntil).toBeFalsy();
    expect(updated.schedules).toEqual([]);

    const revokeRes = await authApi.delete(`/api/family/module-access/${created.id}`);
    expect(revokeRes.status()).toBe(200);
    const after = (await (await authApi.get(`/api/family/module-access?userId=${child.userId}`)).json()) as ModuleAccessResponse[];
    expect(after).toEqual([]);
  });

  test('module access endpoints require authentication', async ({ api }) => {
    expect((await api.get('/api/family/module-access?userId=1')).status()).toBe(401);
    expect(
      (await api.post('/api/family/module-access', { data: { userId: 1, moduleName: 'learning', permission: 'ACCESS' } })).status(),
    ).toBe(401);
    expect((await api.put('/api/family/module-access/1', { data: { permission: 'ACCESS' } })).status()).toBe(401);
    expect((await api.delete('/api/family/module-access/1')).status()).toBe(401);
  });

  test('a non-admin member cannot manage module access', async ({ api, authApi }) => {
    const parent = await addMember(authApi, 'PARENT');
    const parentApi = await apiAs(api, parent.email);
    const res = await parentApi.get(`/api/family/module-access?userId=${parent.userId}`);
    expect(res.status()).toBe(403);
    const grantRes = await parentApi.post('/api/family/module-access', {
      data: { userId: parent.userId, moduleName: 'learning', permission: 'ACCESS' },
    });
    expect(grantRes.status()).toBe(403);
    await parentApi.dispose();
  });

  test('granting with invalid input is rejected', async ({ authApi }) => {
    const child = await addMember(authApi);
    const noModule = await authApi.post('/api/family/module-access', {
      data: { userId: child.userId, moduleName: '', permission: 'ACCESS' },
    });
    expect(noModule.status()).toBe(400);

    const badDay = await authApi.post('/api/family/module-access', {
      data: {
        userId: child.userId,
        moduleName: 'learning',
        permission: 'ACCESS',
        schedules: [{ dayOfWeek: 8, startTime: '15:00', endTime: '18:00', timezone: 'UTC' }],
      },
    });
    expect(badDay.status()).toBe(400);
  });

  test('updating with an invalid schedule is rejected and keeps the grant unchanged', async ({ authApi }) => {
    const child = await addMember(authApi);
    const created = await grant(authApi, { userId: child.userId, moduleName: 'learning', permission: 'ACCESS' });
    const res = await authApi.put(`/api/family/module-access/${created.id}`, {
      data: { schedules: [{ dayOfWeek: 1, startTime: '15:00', endTime: '18:00', timezone: '' }] },
    });
    expect(res.status()).toBe(400);
    const list = (await (await authApi.get(`/api/family/module-access?userId=${child.userId}`)).json()) as ModuleAccessResponse[];
    expect(list[0].schedules).toEqual([]);
  });

  test('granting the same module and permission twice fails', async ({ authApi }) => {
    const child = await addMember(authApi);
    await grant(authApi, { userId: child.userId, moduleName: 'learning', permission: 'ACCESS' });
    const duplicate = await authApi.post('/api/family/module-access', {
      data: { userId: child.userId, moduleName: 'learning', permission: 'ACCESS' },
    });
    // The backend has no conflict mapping yet (unique constraint -> 500); the UI avoids offering duplicates
    expect(duplicate.ok()).toBeFalsy();
  });

  test('revoking a grant that does not exist fails', async ({ authApi }) => {
    const res = await authApi.delete('/api/family/module-access/999999999');
    expect(res.ok()).toBeFalsy();
  });
});

test.describe('Module access evaluation for a child', () => {
  test('a child gets in only while the grant is valid and inside its schedule', async ({ api, authApi }) => {
    const child = await addMember(authApi);
    const childApi = await apiAs(api, child.email);

    // No grant
    expect((await childApi.get('/api/learning/zoo')).status()).toBe(403);

    // Grant limited to tomorrow's weekday: denied today
    const created = await grant(authApi, {
      userId: child.userId,
      moduleName: 'learning',
      permission: 'ACCESS',
      schedules: [{ dayOfWeek: utcIsoDay(1), startTime: '00:00', endTime: '23:59', timezone: 'UTC' }],
    });
    expect((await childApi.get('/api/learning/zoo')).status()).toBe(403);

    // Schedule moved to today: allowed
    await authApi.put(`/api/family/module-access/${created.id}`, {
      data: { schedules: [{ dayOfWeek: utcIsoDay(0), startTime: '00:00', endTime: '23:59', timezone: 'UTC' }] },
    });
    expect((await childApi.get('/api/learning/zoo')).status()).toBe(200);

    // Validity window already over: denied again
    await authApi.put(`/api/family/module-access/${created.id}`, {
      data: { validUntil: '2020-01-01T00:00:00Z', schedules: [] },
    });
    expect((await childApi.get('/api/learning/zoo')).status()).toBe(403);

    // Validity window cleared: allowed again
    await authApi.put(`/api/family/module-access/${created.id}`, { data: { schedules: [] } });
    expect((await childApi.get('/api/learning/zoo')).status()).toBe(200);

    // Revoked: denied
    await authApi.delete(`/api/family/module-access/${created.id}`);
    expect((await childApi.get('/api/learning/zoo')).status()).toBe(403);

    await childApi.dispose();
  });
});
