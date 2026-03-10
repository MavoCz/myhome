import { test, expect } from '../../fixtures/api.fixture';
import { registerUser, loginAs, createTestUser } from '../../helpers/auth';
import type { FamilyMemberResponse, RegisterRequest } from 'myhome-common/api/generated/model';

test.describe('Auth API', () => {
  test('register returns access + refresh tokens', async ({ api }) => {
    const req: RegisterRequest = {
      email: `reg-${Date.now()}@example.com`,
      password: 'Password123!',
      displayName: 'Alice',
      familyName: 'Smith Family',
    };
    const auth = await registerUser(api, req);

    expect(auth.accessToken).toBeTruthy();
    expect(auth.refreshToken).toBeTruthy();
    expect(auth.user?.email).toBe(req.email);
  });

  test('login with valid credentials returns tokens', async ({ api }) => {
    const { email, password } = await createTestUser(api, `login-${Date.now()}`);
    const auth = await loginAs(api, { email, password });

    expect(auth.accessToken).toBeTruthy();
    expect(auth.refreshToken).toBeTruthy();
  });

  test('login with wrong password returns 401', async ({ api }) => {
    const { email } = await createTestUser(api, `badpw-${Date.now()}`);
    const res = await api.post('/api/auth/login', {
      data: { email, password: 'WrongPassword!' },
    });
    expect(res.status()).toBe(401);
  });

  test('register with duplicate email returns 4xx', async ({ api }) => {
    const req: RegisterRequest = {
      email: `dup-${Date.now()}@example.com`,
      password: 'Password123!',
      displayName: 'Bob',
      familyName: 'Dup Family',
    };
    await registerUser(api, req);

    const res = await api.post('/api/auth/register', { data: req });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('authenticated endpoint requires valid token', async ({ api }) => {
    const res = await api.get('/api/family/members');
    expect(res.status()).toBe(401);
  });

  test('authenticated endpoint succeeds with valid token', async ({ authApi }) => {
    const res = await authApi.get('/api/family/members');
    expect(res.ok()).toBeTruthy();
    const members = await res.json();
    expect(Array.isArray(members)).toBeTruthy();
  });

  test('refresh token rotates and returns new tokens', async ({ api }) => {
    const initial = await createTestUser(api, `refresh-${Date.now()}`);

    const refreshRes = await api.post('/api/auth/refresh', {
      data: { refreshToken: initial.refreshToken },
    });
    expect(refreshRes.ok()).toBeTruthy();

    const refreshed = (await refreshRes.json()) as { accessToken?: string; refreshToken?: string };
    expect(refreshed.accessToken).toBeTruthy();
    expect(refreshed.refreshToken).toBeTruthy();

    // Old refresh token should now be invalid (token rotation)
    const secondRefresh = await api.post('/api/auth/refresh', {
      data: { refreshToken: initial.refreshToken },
    });
    expect(secondRefresh.status()).toBe(401);
  });

  test('logout invalidates refresh token', async ({ api }) => {
    const auth = await createTestUser(api, `logout-${Date.now()}`);

    const logoutRes = await api.post('/api/auth/logout', {
      data: { refreshToken: auth.refreshToken },
    });
    expect(logoutRes.ok()).toBeTruthy();

    // Refresh should now fail
    const refreshRes = await api.post('/api/auth/refresh', {
      data: { refreshToken: auth.refreshToken },
    });
    expect(refreshRes.status()).toBe(401);
  });
});

test.describe('Member Color API', () => {
  test('GET /api/family/members returns memberColor field', async ({ authApi }) => {
    const res = await authApi.get('/api/family/members');
    expect(res.ok()).toBeTruthy();
    const members: FamilyMemberResponse[] = await res.json();
    expect(members.length).toBeGreaterThanOrEqual(1);
    // memberColor starts as null
    expect(members[0]).toHaveProperty('memberColor');
  });

  test('PUT /api/family/members/{userId}/color updates member color', async ({ authApi }) => {
    // Get own userId from the members list
    const listRes = await authApi.get('/api/family/members');
    const members: FamilyMemberResponse[] = await listRes.json();
    const userId = members[0].userId!;

    const res = await authApi.put(`/api/family/members/${userId}/color`, {
      data: { color: '#E15759' },
    });
    expect(res.ok()).toBeTruthy();

    // Verify the color was saved
    const membersRes = await authApi.get('/api/family/members');
    const updated: FamilyMemberResponse[] = await membersRes.json();
    const self = updated.find((m) => m.userId === userId);
    expect(self?.memberColor).toBe('#E15759');
  });

  test('PUT /api/family/members/{userId}/color rejects invalid color', async ({ authApi }) => {
    const listRes = await authApi.get('/api/family/members');
    const members: FamilyMemberResponse[] = await listRes.json();
    const userId = members[0].userId!;

    const res = await authApi.put(`/api/family/members/${userId}/color`, {
      data: { color: 'not-a-color' },
    });
    expect(res.ok()).toBeFalsy();
  });

  test('PUT /api/family/members/{userId}/color requires auth', async ({ api }) => {
    const res = await api.put('/api/family/members/1/color', {
      data: { color: '#4E79A7' },
    });
    expect(res.status()).toBe(401);
  });
});
