import { test, expect } from '../../fixtures/api.fixture';
import type { APIRequestContext } from '@playwright/test';
import type {
  ChildProgressResponse,
  CoinGrantResponse,
  MyZooResponse,
  SaveZooResponse,
  ZooResponse,
} from 'myhome-common/api/generated/model';

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

interface Child {
  userId: number;
  email: string;
  token: string;
}

/** Adds a CHILD to the admin's family, optionally grants the learning module, and logs the child in. */
async function createChild(
  api: APIRequestContext,
  adminToken: string,
  familyId: number,
  tag: string,
  withAccess = true,
): Promise<Child> {
  const email = `${tag}-${Date.now()}@example.com`;
  const addRes = await api.post('/api/family/members', {
    headers: bearer(adminToken),
    data: { email, password: 'Password123!', displayName: `Child ${tag}`, role: 'CHILD' },
  });
  if (!addRes.ok()) throw new Error(`Add child failed: ${addRes.status()} ${await addRes.text()}`);
  const member = await addRes.json();

  if (withAccess) {
    const grantRes = await api.post('/api/family/module-access', {
      headers: bearer(adminToken),
      data: { userId: member.userId, familyId, moduleName: 'learning', permission: 'ACCESS' },
    });
    if (!grantRes.ok()) throw new Error(`Grant access failed: ${grantRes.status()} ${await grantRes.text()}`);
  }

  const loginRes = await api.post('/api/auth/login', { data: { email, password: 'Password123!' } });
  return { userId: member.userId, email, token: (await loginRes.json()).accessToken };
}

function zooState(coins: number, earned = coins) {
  return {
    schema: 1,
    coins,
    earned,
    avatar: { hair: '#5b3a29', outfit: '#e85d75', skin: '#f2c9a0' },
    objects: [{ id: 'p1', kind: 'path', x: 12, y: 13 }],
    animals: [],
  };
}

async function saveZoo(api: APIRequestContext, token: string, version: number, state: object, claimedGrantIds?: number[]) {
  return api.put('/api/learning/zoo', { headers: bearer(token), data: { version, state, claimedGrantIds } });
}

test.describe('Learning zoo API', () => {
  test('requires authentication', async ({ api }) => {
    const res = await api.get('/api/learning/zoo');
    expect(res.status()).toBe(401);
  });

  test('child without learning access is refused', async ({ api, authResponse }) => {
    const child = await createChild(api, authResponse.accessToken!, authResponse.user!.familyId!, 'no-access', false);
    const res = await api.get('/api/learning/zoo', { headers: bearer(child.token) });
    expect(res.status()).toBe(403);
  });

  test('parents have no zoo of their own', async ({ api, authResponse }) => {
    const res = await api.get('/api/learning/zoo', { headers: bearer(authResponse.accessToken!) });
    expect(res.status()).toBe(403);
  });

  test('child creates and updates the zoo with optimistic versions', async ({ api, authResponse }) => {
    const child = await createChild(api, authResponse.accessToken!, authResponse.user!.familyId!, 'zoo');

    const empty: MyZooResponse = await (await api.get('/api/learning/zoo', { headers: bearer(child.token) })).json();
    expect(empty.version).toBe(0);
    expect(empty.state).toBeNull();
    expect(empty.displayName).toContain('Child zoo');

    const created = await saveZoo(api, child.token, 0, zooState(40));
    expect(created.ok()).toBeTruthy();
    expect(((await created.json()) as SaveZooResponse).version).toBe(1);

    // A second "first save" (e.g. from another tablet) conflicts
    expect((await saveZoo(api, child.token, 0, zooState(1))).status()).toBe(409);

    const updated = await saveZoo(api, child.token, 1, zooState(45));
    expect(((await updated.json()) as SaveZooResponse).version).toBe(2);

    // A stale version conflicts and leaves the stored zoo alone
    expect((await saveZoo(api, child.token, 1, zooState(999))).status()).toBe(409);

    const loaded: MyZooResponse = await (await api.get('/api/learning/zoo', { headers: bearer(child.token) })).json();
    expect(loaded.version).toBe(2);
    expect(loaded.state).toMatchObject({ coins: 45, objects: [{ kind: 'path' }] });
  });

  test('an oversized zoo is rejected', async ({ api, authResponse }) => {
    const child = await createChild(api, authResponse.accessToken!, authResponse.user!.familyId!, 'big');
    const state = { ...zooState(1), padding: 'x'.repeat(300 * 1024) };
    expect((await saveZoo(api, child.token, 0, state)).status()).toBe(413);
  });

  test('siblings and parents see the family zoos', async ({ api, authResponse }) => {
    const adminToken = authResponse.accessToken!;
    const familyId = authResponse.user!.familyId!;
    const ema = await createChild(api, adminToken, familyId, 'ema');
    const ela = await createChild(api, adminToken, familyId, 'ela');
    await saveZoo(api, ema.token, 0, zooState(12));

    const seenBySibling: ZooResponse[] = await (await api.get('/api/learning/zoos', { headers: bearer(ela.token) })).json();
    expect(seenBySibling).toHaveLength(1);
    expect(seenBySibling[0]).toMatchObject({ userId: ema.userId, state: { coins: 12 } });

    const seenByParent: ZooResponse[] = await (await api.get('/api/learning/zoos', { headers: bearer(adminToken) })).json();
    expect(seenByParent.map((z) => z.userId)).toEqual([ema.userId]);
  });

  test('zoos of another family stay hidden', async ({ api, authResponse }) => {
    const child = await createChild(api, authResponse.accessToken!, authResponse.user!.familyId!, 'own');
    await saveZoo(api, child.token, 0, zooState(5));

    const otherAdmin = await api.post('/api/auth/register', {
      data: {
        email: `other-${Date.now()}@example.com`,
        password: 'Password123!',
        displayName: 'Other parent',
        familyName: 'Other family',
      },
    });
    const otherToken = (await otherAdmin.json()).accessToken;
    const zoos: ZooResponse[] = await (await api.get('/api/learning/zoos', { headers: bearer(otherToken) })).json();
    expect(zoos).toEqual([]);
  });
});

test.describe('Learning progress API', () => {
  test('results are counted once per clientId and summed per day', async ({ api, authResponse }) => {
    const adminToken = authResponse.accessToken!;
    const child = await createChild(api, adminToken, authResponse.user!.familyId!, 'progress');
    await saveZoo(api, child.token, 0, zooState(30, 52));

    const solvedAt = new Date().toISOString();
    const results = [
      { clientId: 'r1', exercise: 'scitani', event: { kind: 'problem', mistakes: 0, carry: true }, coins: 3, solvedAt },
      { clientId: 'r2', exercise: 'scitani', event: { kind: 'problem', mistakes: 2, carry: false }, coins: 1, solvedAt },
      { clientId: 'r3', exercise: 'vyjmenovana', event: { kind: 'round', correct: 8, total: 10, retry: false }, coins: 8, solvedAt },
    ];
    const first = await api.post('/api/learning/results', { headers: bearer(child.token), data: { results } });
    expect(first.status()).toBe(204);
    // The app resends its outbox after a lost response; nothing is counted twice
    await api.post('/api/learning/results', { headers: bearer(child.token), data: { results: results.slice(0, 2) } });

    const res = await api.get('/api/learning/progress?days=7&timezone=Europe/Prague', { headers: bearer(adminToken) });
    expect(res.ok()).toBeTruthy();
    const progress: ChildProgressResponse[] = await res.json();
    const mine = progress.find((p) => p.userId === child.userId)!;
    expect(mine).toMatchObject({ coins: 30, earned: 52 });
    expect(mine.days).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ exercise: 'scitani', count: 2, coins: 4 }),
        expect.objectContaining({ exercise: 'vyjmenovana', count: 1, coins: 8 }),
      ]),
    );
  });

  test('children cannot read progress or grant coins', async ({ api, authResponse }) => {
    const child = await createChild(api, authResponse.accessToken!, authResponse.user!.familyId!, 'nosy');
    expect((await api.get('/api/learning/progress', { headers: bearer(child.token) })).status()).toBe(403);
    const grant = await api.post('/api/learning/grants', {
      headers: bearer(child.token),
      data: { userId: child.userId, amount: 100 },
    });
    expect(grant.status()).toBe(403);
  });

  test('an unknown timezone is a bad request', async ({ api, authResponse }) => {
    const res = await api.get('/api/learning/progress?timezone=Mars/Base', {
      headers: bearer(authResponse.accessToken!),
    });
    expect(res.status()).toBe(400);
  });
});

test.describe('Learning bonus coins API', () => {
  test('a grant is claimed exactly once together with the zoo save', async ({ api, authResponse }) => {
    const adminToken = authResponse.accessToken!;
    const child = await createChild(api, adminToken, authResponse.user!.familyId!, 'bonus');
    await saveZoo(api, child.token, 0, zooState(10));

    const grantRes = await api.post('/api/learning/grants', {
      headers: bearer(adminToken),
      data: { userId: child.userId, amount: 20, note: 'Za uklizený pokoj' },
    });
    expect(grantRes.ok()).toBeTruthy();
    const grant: CoinGrantResponse = await grantRes.json();
    expect(grant).toMatchObject({ amount: 20, note: 'Za uklizený pokoj', claimedAt: null });

    const before: MyZooResponse = await (await api.get('/api/learning/zoo', { headers: bearer(child.token) })).json();
    expect(before.pendingGrants!.map((g) => g.id)).toEqual([grant.id]);

    expect((await saveZoo(api, child.token, 1, zooState(30), [grant.id!])).ok()).toBeTruthy();

    const after: MyZooResponse = await (await api.get('/api/learning/zoo', { headers: bearer(child.token) })).json();
    expect(after.pendingGrants).toEqual([]);

    // Claiming again (a second tablet) conflicts and rolls the whole save back
    expect((await saveZoo(api, child.token, 2, zooState(50), [grant.id!])).status()).toBe(409);
    const unchanged: MyZooResponse = await (await api.get('/api/learning/zoo', { headers: bearer(child.token) })).json();
    expect(unchanged.version).toBe(2);
    expect(unchanged.state).toMatchObject({ coins: 30 });

    const recent: CoinGrantResponse[] = await (await api.get('/api/learning/grants', { headers: bearer(adminToken) })).json();
    expect(recent[0].claimedAt).not.toBeNull();
  });

  test('coins can only go to a child of the family', async ({ api, authResponse }) => {
    const res = await api.post('/api/learning/grants', {
      headers: bearer(authResponse.accessToken!),
      data: { userId: authResponse.user!.id, amount: 5 },
    });
    expect(res.status()).toBe(400);
  });

  test('removing a child from the family deletes their learning data', async ({ api, authResponse }) => {
    const adminToken = authResponse.accessToken!;
    const familyId = authResponse.user!.familyId!;
    const child = await createChild(api, adminToken, familyId, 'leaving');
    await saveZoo(api, child.token, 0, zooState(7));

    const removeRes = await api.delete(`/api/family/members/${child.userId}`, { headers: bearer(adminToken) });
    expect(removeRes.ok()).toBeTruthy();

    // Invite the same account back: the listener (runs after the removal commits) has wiped the old zoo
    await expect
      .poll(async () => {
        await api.post('/api/family/members/invite', {
          headers: bearer(adminToken),
          data: { email: child.email, role: 'CHILD' },
        });
        await api.post('/api/family/module-access', {
          headers: bearer(adminToken),
          data: { userId: child.userId, familyId, moduleName: 'learning', permission: 'ACCESS' },
        });
        const login = await api.post('/api/auth/login', { data: { email: child.email, password: 'Password123!' } });
        const token = (await login.json()).accessToken;
        const zoo: MyZooResponse = await (await api.get('/api/learning/zoo', { headers: bearer(token) })).json();
        if (zoo.version !== 0) {
          await api.delete(`/api/family/members/${child.userId}`, { headers: bearer(adminToken) });
        }
        return zoo.version;
      })
      .toBe(0);
  });
});
