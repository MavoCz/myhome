import { test, expect } from '../../fixtures/api.fixture';
import type { APIRequestContext } from '@playwright/test';
import type {
  ExpenseGroupResponse,
  ExpenseResponse,
  BalanceResponse,
  MonthlySummaryResponse,
  ExchangeRateResponse,
  EditHistoryResponse,
  SplitConfigResponse,
} from 'myhome-common/api/generated/model';

const BACKEND_PORT = process.env.TEST_BACKEND_PORT ?? '8081';
const BASE_URL = `http://localhost:${BACKEND_PORT}`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Shorthand header builder. */
function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Grant the expenses module permission to another user.
 * `moduleName` must match the GrantModuleAccessRequest DTO field name.
 */
async function grantExpensesAccess(
  api: APIRequestContext,
  adminToken: string,
  targetUserId: number,
  familyId: number,
  permission: 'ACCESS' | 'MANAGE' = 'ACCESS',
) {
  const res = await api.post('/api/family/module-access', {
    headers: bearer(adminToken),
    data: { userId: targetUserId, familyId, moduleName: 'expenses', permission },
  });
  if (!res.ok()) {
    throw new Error(`Grant access failed: ${res.status()} ${await res.text()}`);
  }
}

/**
 * Ensures the default group exists (listGroups auto-creates it) and returns its id.
 */
async function ensureDefaultGroup(api: APIRequestContext, token: string): Promise<number> {
  const res = await api.get('/api/expenses/groups', { headers: bearer(token) });
  const groups: ExpenseGroupResponse[] = await res.json();
  if (groups.length === 0) throw new Error('No default group was created');
  return groups[0].id!;
}

// ===========================================================================
// Expense Groups
// ===========================================================================

test.describe('Expense Groups API', () => {
  test('GET /api/expenses/groups creates default group for new family', async ({ api, authResponse }) => {
    const token = authResponse.accessToken!;
    const res = await api.get('/api/expenses/groups', { headers: bearer(token) });
    expect(res.ok()).toBeTruthy();
    const groups: ExpenseGroupResponse[] = await res.json();
    expect(Array.isArray(groups)).toBeTruthy();
    expect(groups.length).toBeGreaterThanOrEqual(1);
    const defaultGroup = groups.find((g) => g.isDefault);
    expect(defaultGroup).toBeDefined();
  });

  test('GET /api/expenses/groups requires auth', async ({ api }) => {
    const res = await api.get('/api/expenses/groups');
    expect(res.status()).toBe(401);
  });

  test('POST /api/expenses/groups creates a new group', async ({ api, authResponse }) => {
    const token = authResponse.accessToken!;
    const res = await api.post('/api/expenses/groups', {
      headers: bearer(token),
      data: { name: 'Utilities', description: 'Electricity and water' },
    });
    expect(res.ok()).toBeTruthy();
    const group: ExpenseGroupResponse = await res.json();
    expect(group.id).toBeTruthy();
    expect(group.name).toBe('Utilities');
    expect(group.archived).toBe(false);
    expect(group.isDefault).toBe(false);
  });

  test('POST /api/expenses/groups rejects duplicate name', async ({ api, authResponse }) => {
    const token = authResponse.accessToken!;
    await api.post('/api/expenses/groups', { headers: bearer(token), data: { name: 'DupGroup' } });
    const res = await api.post('/api/expenses/groups', {
      headers: bearer(token),
      data: { name: 'DupGroup' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('POST /api/expenses/groups rejects empty name', async ({ api, authResponse }) => {
    const token = authResponse.accessToken!;
    const res = await api.post('/api/expenses/groups', {
      headers: bearer(token),
      data: { name: '' },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('PUT /api/expenses/groups/:id updates group name and description', async ({ api, authResponse }) => {
    const token = authResponse.accessToken!;
    const createRes = await api.post('/api/expenses/groups', {
      headers: bearer(token),
      data: { name: 'OldName', description: 'Old desc' },
    });
    const created: ExpenseGroupResponse = await createRes.json();

    const updateRes = await api.put(`/api/expenses/groups/${created.id}`, {
      headers: bearer(token),
      data: { name: 'NewName', description: 'New desc' },
    });
    expect(updateRes.ok()).toBeTruthy();
    const updated: ExpenseGroupResponse = await updateRes.json();
    expect(updated.name).toBe('NewName');
    expect(updated.description).toBe('New desc');
  });

  test('POST /api/expenses/groups/:id/archive archives a non-default group', async ({ api, authResponse }) => {
    const token = authResponse.accessToken!;
    const createRes = await api.post('/api/expenses/groups', {
      headers: bearer(token),
      data: { name: 'ArchiveMe' },
    });
    const group: ExpenseGroupResponse = await createRes.json();

    const archiveRes = await api.post(`/api/expenses/groups/${group.id}/archive`, {
      headers: bearer(token),
    });
    expect(archiveRes.ok()).toBeTruthy();

    const listRes = await api.get('/api/expenses/groups', { headers: bearer(token) });
    const groups: ExpenseGroupResponse[] = await listRes.json();
    const found = groups.find((g) => g.id === group.id);
    expect(found?.archived).toBe(true);
  });

  test('DELETE /api/expenses/groups/:id deletes empty group', async ({ api, authResponse }) => {
    const token = authResponse.accessToken!;
    const createRes = await api.post('/api/expenses/groups', {
      headers: bearer(token),
      data: { name: 'DeleteMe' },
    });
    const group: ExpenseGroupResponse = await createRes.json();

    const deleteRes = await api.delete(`/api/expenses/groups/${group.id}`, {
      headers: bearer(token),
    });
    expect(deleteRes.ok()).toBeTruthy();

    const listRes = await api.get('/api/expenses/groups', { headers: bearer(token) });
    const groups: ExpenseGroupResponse[] = await listRes.json();
    expect(groups.find((g) => g.id === group.id)).toBeUndefined();
  });

  test('PUT /api/expenses/groups/:id/splits sets split configuration', async ({ api, authResponse }) => {
    const token = authResponse.accessToken!;
    const userId = authResponse.user!.id!;
    const groupRes = await api.post('/api/expenses/groups', {
      headers: bearer(token),
      data: { name: 'SplitGroup' },
    });
    const group: ExpenseGroupResponse = await groupRes.json();

    const splitRes = await api.put(`/api/expenses/groups/${group.id}/splits`, {
      headers: bearer(token),
      data: { splits: [{ userId, sharePct: 100 }] },
    });
    expect(splitRes.ok()).toBeTruthy();
    const config: SplitConfigResponse = await splitRes.json();
    expect(config.groupId).toBe(group.id);
    expect(config.splits).toHaveLength(1);
    expect(config.splits![0].userId).toBe(userId);
  });

  test('PUT /api/expenses/groups/:id/splits rejects splits not summing to 100', async ({
    api,
    authResponse,
  }) => {
    const token = authResponse.accessToken!;
    const userId = authResponse.user!.id!;
    const groupRes = await api.post('/api/expenses/groups', {
      headers: bearer(token),
      data: { name: 'BadSplit' },
    });
    const group: ExpenseGroupResponse = await groupRes.json();

    const res = await api.put(`/api/expenses/groups/${group.id}/splits`, {
      headers: bearer(token),
      data: { splits: [{ userId, sharePct: 60 }] },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});

// ===========================================================================
// Expenses CRUD
// ===========================================================================

test.describe('Expenses API', () => {
  test('GET /api/expenses returns paginated list', async ({ api, authResponse }) => {
    const token = authResponse.accessToken!;
    const res = await api.get('/api/expenses?page=0&size=10', { headers: bearer(token) });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.content)).toBeTruthy();
  });

  test('GET /api/expenses requires auth', async ({ api }) => {
    const res = await api.get('/api/expenses?page=0&size=10');
    expect(res.status()).toBe(401);
  });

  test('POST /api/expenses creates expense in CZK', async ({ api, authResponse }) => {
    const token = authResponse.accessToken!;
    const userId = authResponse.user!.id!;
    const groupId = await ensureDefaultGroup(api, token);

    const res = await api.post('/api/expenses', {
      headers: bearer(token),
      data: {
        description: 'Supermarket run',
        amount: 1250,
        currency: 'CZK',
        date: '2026-02-15',
        paidByUserId: userId,
        groupId,
      },
    });
    expect(res.ok()).toBeTruthy();
    const expense: ExpenseResponse = await res.json();
    expect(expense.id).toBeTruthy();
    expect(expense.description).toBe('Supermarket run');
    expect(Number(expense.czkAmount)).toBeCloseTo(1250, 0);
    expect(expense.originalCurrency).toBe('CZK');
    expect(expense.paidBy?.userId).toBe(userId);
  });

  test('POST /api/expenses creates expense in EUR and converts to CZK', async ({ api, authResponse }) => {
    const token = authResponse.accessToken!;
    const userId = authResponse.user!.id!;
    const groupId = await ensureDefaultGroup(api, token);

    const res = await api.post('/api/expenses', {
      headers: bearer(token),
      data: {
        description: 'Flight ticket',
        amount: 100,
        currency: 'EUR',
        date: '2026-02-15',
        paidByUserId: userId,
        groupId,
      },
    });
    expect(res.ok()).toBeTruthy();
    const expense: ExpenseResponse = await res.json();
    expect(expense.originalCurrency).toBe('EUR');
    expect(Number(expense.originalAmount)).toBeCloseTo(100, 0);
    expect(Number(expense.czkAmount)).toBeGreaterThan(0);
  });

  test('POST /api/expenses rejects missing description', async ({ api, authResponse }) => {
    const token = authResponse.accessToken!;
    const userId = authResponse.user!.id!;
    const groupId = await ensureDefaultGroup(api, token);

    const res = await api.post('/api/expenses', {
      headers: bearer(token),
      data: {
        description: '',
        amount: 100,
        currency: 'CZK',
        date: '2026-02-01',
        paidByUserId: userId,
        groupId,
      },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('POST /api/expenses requires auth', async ({ api }) => {
    const res = await api.post('/api/expenses', {
      data: {
        description: 'Test',
        amount: 100,
        currency: 'CZK',
        date: '2026-02-01',
        paidByUserId: 1,
        groupId: 1,
      },
    });
    expect(res.status()).toBe(401);
  });

  test('PUT /api/expenses/:id updates description and amount', async ({ api, authResponse }) => {
    const token = authResponse.accessToken!;
    const userId = authResponse.user!.id!;
    const groupId = await ensureDefaultGroup(api, token);

    const createRes = await api.post('/api/expenses', {
      headers: bearer(token),
      data: {
        description: 'Original',
        amount: 200,
        currency: 'CZK',
        date: '2026-02-01',
        paidByUserId: userId,
        groupId,
      },
    });
    const created: ExpenseResponse = await createRes.json();

    const updateRes = await api.put(`/api/expenses/${created.id}`, {
      headers: bearer(token),
      data: {
        description: 'Updated description',
        amount: 300,
        currency: 'CZK',
        date: '2026-02-05',
        paidByUserId: userId,
        groupId,
      },
    });
    expect(updateRes.ok()).toBeTruthy();
    const updated: ExpenseResponse = await updateRes.json();
    expect(updated.description).toBe('Updated description');
    expect(Number(updated.czkAmount)).toBeCloseTo(300, 0);
  });

  test('DELETE /api/expenses/:id soft-deletes expense', async ({ api, authResponse }) => {
    const token = authResponse.accessToken!;
    const userId = authResponse.user!.id!;
    const groupId = await ensureDefaultGroup(api, token);

    const createRes = await api.post('/api/expenses', {
      headers: bearer(token),
      data: {
        description: 'To be deleted',
        amount: 50,
        currency: 'CZK',
        date: '2026-02-01',
        paidByUserId: userId,
        groupId,
      },
    });
    const created: ExpenseResponse = await createRes.json();

    const deleteRes = await api.delete(`/api/expenses/${created.id}`, { headers: bearer(token) });
    expect(deleteRes.ok()).toBeTruthy();

    const listRes = await api.get('/api/expenses?page=0&size=100', { headers: bearer(token) });
    const body = await listRes.json();
    const ids = (body.content as ExpenseResponse[]).map((e) => e.id);
    expect(ids).not.toContain(created.id);
  });

  test('POST /api/expenses/:id/restore restores a deleted expense', async ({ api, authResponse }) => {
    const token = authResponse.accessToken!;
    const userId = authResponse.user!.id!;
    const groupId = await ensureDefaultGroup(api, token);

    const createRes = await api.post('/api/expenses', {
      headers: bearer(token),
      data: {
        description: 'Restore me',
        amount: 75,
        currency: 'CZK',
        date: '2026-02-01',
        paidByUserId: userId,
        groupId,
      },
    });
    const created: ExpenseResponse = await createRes.json();

    await api.delete(`/api/expenses/${created.id}`, { headers: bearer(token) });

    const restoreRes = await api.post(`/api/expenses/${created.id}/restore`, {
      headers: bearer(token),
    });
    expect(restoreRes.ok()).toBeTruthy();

    const listRes = await api.get('/api/expenses?page=0&size=100', { headers: bearer(token) });
    const body = await listRes.json();
    const ids = (body.content as ExpenseResponse[]).map((e) => e.id);
    expect(ids).toContain(created.id);
  });

  test('GET /api/expenses/:id/history returns edit history after update', async ({ api, authResponse }) => {
    const token = authResponse.accessToken!;
    const userId = authResponse.user!.id!;
    const groupId = await ensureDefaultGroup(api, token);

    const createRes = await api.post('/api/expenses', {
      headers: bearer(token),
      data: {
        description: 'History test',
        amount: 100,
        currency: 'CZK',
        date: '2026-02-01',
        paidByUserId: userId,
        groupId,
      },
    });
    const created: ExpenseResponse = await createRes.json();

    await api.put(`/api/expenses/${created.id}`, {
      headers: bearer(token),
      data: {
        description: 'History updated',
        amount: 150,
        currency: 'CZK',
        date: '2026-02-01',
        paidByUserId: userId,
        groupId,
      },
    });

    const histRes = await api.get(`/api/expenses/${created.id}/history`, { headers: bearer(token) });
    expect(histRes.ok()).toBeTruthy();
    const history: EditHistoryResponse[] = await histRes.json();
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0].editedByUserId).toBe(userId);
    expect(history[0].changedFields).toBeDefined();
  });

  test('GET /api/expenses filters by groupId', async ({ api, authResponse }) => {
    const token = authResponse.accessToken!;
    const userId = authResponse.user!.id!;
    await api.get('/api/expenses/groups', { headers: bearer(token) }); // auto-create default

    const g1Res = await api.post('/api/expenses/groups', {
      headers: bearer(token),
      data: { name: 'FilterGroup1' },
    });
    const g1: ExpenseGroupResponse = await g1Res.json();

    await api.post('/api/expenses', {
      headers: bearer(token),
      data: { description: 'In G1', amount: 10, currency: 'CZK', date: '2026-02-01', paidByUserId: userId, groupId: g1.id },
    });

    const defaultGroupId = await ensureDefaultGroup(api, token);
    await api.post('/api/expenses', {
      headers: bearer(token),
      data: { description: 'In Default', amount: 20, currency: 'CZK', date: '2026-02-01', paidByUserId: userId, groupId: defaultGroupId },
    });

    const res = await api.get(`/api/expenses?groupId=${g1.id}&page=0&size=100`, {
      headers: bearer(token),
    });
    const body = await res.json();
    const descriptions = (body.content as ExpenseResponse[]).map((e) => e.description);
    expect(descriptions).toContain('In G1');
    expect(descriptions).not.toContain('In Default');
  });
});

// ===========================================================================
// Balances
// ===========================================================================

test.describe('Expense Balances API', () => {
  test('GET /api/expenses/balances returns balance list', async ({ api, authResponse }) => {
    const token = authResponse.accessToken!;
    const res = await api.get('/api/expenses/balances', { headers: bearer(token) });
    expect(res.ok()).toBeTruthy();
    const balances: BalanceResponse[] = await res.json();
    expect(Array.isArray(balances)).toBeTruthy();
  });

  test('GET /api/expenses/balances requires auth', async ({ api }) => {
    const res = await api.get('/api/expenses/balances');
    expect(res.status()).toBe(401);
  });

  test('balance reflects created expense', async ({ api, authResponse }) => {
    const token = authResponse.accessToken!;
    const userId = authResponse.user!.id!;
    const groupId = await ensureDefaultGroup(api, token);

    await api.post('/api/expenses', {
      headers: bearer(token),
      data: {
        description: 'Balance check expense',
        amount: 1000,
        currency: 'CZK',
        date: '2026-02-01',
        paidByUserId: userId,
        groupId,
      },
    });

    const res = await api.get('/api/expenses/balances', { headers: bearer(token) });
    const balances: BalanceResponse[] = await res.json();
    const myBalance = balances.find((b) => b.userId === userId);
    expect(myBalance).toBeDefined();
    expect(Number(myBalance!.totalPaidCzk)).toBeGreaterThanOrEqual(1000);
  });

  test('deleted expense is excluded from balance', async ({ api, authResponse }) => {
    const token = authResponse.accessToken!;
    const userId = authResponse.user!.id!;
    const groupId = await ensureDefaultGroup(api, token);

    const createRes = await api.post('/api/expenses', {
      headers: bearer(token),
      data: {
        description: 'Temp expense',
        amount: 9999,
        currency: 'CZK',
        date: '2026-02-01',
        paidByUserId: userId,
        groupId,
      },
    });
    const expense: ExpenseResponse = await createRes.json();
    await api.delete(`/api/expenses/${expense.id}`, { headers: bearer(token) });

    const balRes = await api.get('/api/expenses/balances', { headers: bearer(token) });
    const balances: BalanceResponse[] = await balRes.json();
    const myBalance = balances.find((b) => b.userId === userId);
    // totalPaidCzk should NOT include the deleted 9999 expense
    expect(Number(myBalance?.totalPaidCzk ?? 0)).toBeLessThan(9999);
  });
});

// ===========================================================================
// Monthly Summary
// ===========================================================================

test.describe('Monthly Summary API', () => {
  test('GET /api/expenses/summary returns summary for current month', async ({ api, authResponse }) => {
    const token = authResponse.accessToken!;
    const now = new Date();
    const res = await api.get(
      `/api/expenses/summary?year=${now.getFullYear()}&month=${now.getMonth() + 1}`,
      { headers: bearer(token) },
    );
    expect(res.ok()).toBeTruthy();
    const summary: MonthlySummaryResponse = await res.json();
    expect(summary).toBeDefined();
    expect(typeof summary.totalCzk).toBe('number');
  });

  test('GET /api/expenses/summary requires auth', async ({ api }) => {
    const res = await api.get('/api/expenses/summary?year=2026&month=2');
    expect(res.status()).toBe(401);
  });

  test('summary includes expense created this month', async ({ api, authResponse }) => {
    const token = authResponse.accessToken!;
    const userId = authResponse.user!.id!;
    const groupId = await ensureDefaultGroup(api, token);
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15`;

    await api.post('/api/expenses', {
      headers: bearer(token),
      data: {
        description: 'Summary expense',
        amount: 2500,
        currency: 'CZK',
        date: dateStr,
        paidByUserId: userId,
        groupId,
      },
    });

    const res = await api.get(
      `/api/expenses/summary?year=${now.getFullYear()}&month=${now.getMonth() + 1}`,
      { headers: bearer(token) },
    );
    const summary: MonthlySummaryResponse = await res.json();
    expect(Number(summary.totalCzk)).toBeGreaterThanOrEqual(2500);
    expect(summary.memberTotals).toBeDefined();
    expect(summary.memberTotals!.length).toBeGreaterThanOrEqual(1);
  });

  test('summary has settlement plan when balances are uneven', async ({ api, authResponse }) => {
    const adminToken = authResponse.accessToken!;
    const adminUserId = authResponse.user!.id!;

    // Add a second PARENT member to the same family
    const tag = `mem2-sum-${Date.now()}`;
    const addRes = await api.post('/api/family/members', {
      headers: bearer(adminToken),
      data: {
        email: `${tag}@example.com`,
        password: 'Password123!',
        displayName: `Member2 ${tag}`,
        role: 'PARENT',
      },
    });
    expect(addRes.ok()).toBeTruthy();
    const member2 = await addRes.json();
    const member2Id = member2.userId;

    const groupId = await ensureDefaultGroup(api, adminToken);
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15`;

    // Admin pays a shared expense split 50/50; member2 owes half
    await api.post('/api/expenses', {
      headers: bearer(adminToken),
      data: {
        description: 'Shared dinner',
        amount: 1000,
        currency: 'CZK',
        date: dateStr,
        paidByUserId: adminUserId,
        groupId,
        splits: [
          { userId: adminUserId, sharePct: 50 },
          { userId: member2Id, sharePct: 50 },
        ],
      },
    });

    const res = await api.get(
      `/api/expenses/summary?year=${now.getFullYear()}&month=${now.getMonth() + 1}`,
      { headers: bearer(adminToken) },
    );
    const summary: MonthlySummaryResponse = await res.json();
    expect(summary.settlementPlan).toBeDefined();
    expect(summary.settlementPlan!.length).toBeGreaterThanOrEqual(1);

    const settlement = summary.settlementPlan![0];
    expect(settlement.fromDisplayName).toBeTruthy();
    expect(settlement.toDisplayName).toBeTruthy();
    expect(Number(settlement.amountCzk)).toBeGreaterThan(0);
  });
});

// ===========================================================================
// Exchange Rates
// ===========================================================================

test.describe('Exchange Rates API', () => {
  test('GET /api/expenses/rates returns rate list', async ({ api, authResponse }) => {
    const token = authResponse.accessToken!;
    const res = await api.get('/api/expenses/rates', { headers: bearer(token) });
    expect(res.ok()).toBeTruthy();
    const rates: ExchangeRateResponse[] = await res.json();
    expect(Array.isArray(rates)).toBeTruthy();
    if (rates.length > 0) {
      const eur = rates.find((r) => r.currencyCode === 'EUR');
      if (eur) {
        expect(Number(eur.rateToCzk)).toBeGreaterThan(0);
      }
    }
  });

  test('GET /api/expenses/rates requires auth', async ({ api }) => {
    const res = await api.get('/api/expenses/rates');
    expect(res.status()).toBe(401);
  });
});

// ===========================================================================
// Permission checks
// ===========================================================================

test.describe('Expense permission checks', () => {
  test('CHILD member without access cannot list expenses', async ({ api, authResponse }) => {
    const adminToken = authResponse.accessToken!;

    const tag = `child-perm-${Date.now()}`;
    const addRes = await api.post('/api/family/members', {
      headers: bearer(adminToken),
      data: {
        email: `${tag}@example.com`,
        password: 'Password123!',
        displayName: `Child ${tag}`,
        role: 'CHILD',
      },
    });
    expect(addRes.ok()).toBeTruthy();

    const loginRes = await api.post('/api/auth/login', {
      data: { email: `${tag}@example.com`, password: 'Password123!' },
    });
    const childAuth = await loginRes.json();
    const childToken = childAuth.accessToken;

    const res = await api.get('/api/expenses?page=0&size=10', {
      headers: bearer(childToken),
    });
    expect(res.status()).toBe(403);
  });

  test('CHILD member with ACCESS can list expenses but not create groups', async ({
    api,
    authResponse,
  }) => {
    const adminToken = authResponse.accessToken!;
    const adminFamilyId = authResponse.user!.familyId!;

    const tag = `child-access-${Date.now()}`;
    const addRes = await api.post('/api/family/members', {
      headers: bearer(adminToken),
      data: {
        email: `${tag}@example.com`,
        password: 'Password123!',
        displayName: `Child ACCESS ${tag}`,
        role: 'CHILD',
      },
    });
    const member = await addRes.json();

    await grantExpensesAccess(api, adminToken, member.userId, adminFamilyId, 'ACCESS');

    const loginRes = await api.post('/api/auth/login', {
      data: { email: `${tag}@example.com`, password: 'Password123!' },
    });
    const childToken = (await loginRes.json()).accessToken;

    // Can list expenses (ACCESS is sufficient)
    const listRes = await api.get('/api/expenses?page=0&size=10', {
      headers: bearer(childToken),
    });
    expect(listRes.ok()).toBeTruthy();

    // Cannot create a group (MANAGE required)
    const createGroupRes = await api.post('/api/expenses/groups', {
      headers: bearer(childToken),
      data: { name: 'ShouldFail' },
    });
    expect(createGroupRes.status()).toBe(403);
  });

  test('CHILD member with MANAGE permission can create groups', async ({
    api,
    authResponse,
  }) => {
    const adminToken = authResponse.accessToken!;
    const adminFamilyId = authResponse.user!.familyId!;

    const tag = `child-manage-${Date.now()}`;
    const addRes = await api.post('/api/family/members', {
      headers: bearer(adminToken),
      data: {
        email: `${tag}@example.com`,
        password: 'Password123!',
        displayName: `Child MANAGE ${tag}`,
        role: 'CHILD',
      },
    });
    const member = await addRes.json();

    await grantExpensesAccess(api, adminToken, member.userId, adminFamilyId, 'MANAGE');

    const loginRes = await api.post('/api/auth/login', {
      data: { email: `${tag}@example.com`, password: 'Password123!' },
    });
    const managerToken = (await loginRes.json()).accessToken;

    const createGroupRes = await api.post('/api/expenses/groups', {
      headers: bearer(managerToken),
      data: { name: 'ChildManagedGroup' },
    });
    expect(createGroupRes.ok()).toBeTruthy();
  });
});
