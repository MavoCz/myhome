import { test, expect } from '../../fixtures/page.fixture';
import { request, type Page } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import type { AuthResponse, GrantModuleAccessRequest, ModuleAccessResponse } from 'myhome-common/api/generated/model';

dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

const BACKEND_PORT = process.env.TEST_BACKEND_PORT ?? '8081';
const PASSWORD = 'Password123!';

// Dates and the default schedule timezone come from the browser
test.use({ timezoneId: 'Europe/Prague', locale: 'en-US' });

interface Member {
  userId: number;
  email: string;
  name: string;
}

async function backend(token?: string) {
  return request.newContext({
    baseURL: `http://localhost:${BACKEND_PORT}`,
    extraHTTPHeaders: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

async function addMember(admin: AuthResponse, name: string, role: 'CHILD' | 'PARENT' = 'CHILD'): Promise<Member> {
  const api = await backend(admin.accessToken);
  const email = `${name.toLowerCase()}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  const res = await api.post('/api/family/members', { data: { email, password: PASSWORD, displayName: name, role } });
  expect(res.ok()).toBeTruthy();
  const member = (await res.json()) as { userId: number };
  await api.dispose();
  return { userId: member.userId, email, name };
}

async function grantViaApi(admin: AuthResponse, data: GrantModuleAccessRequest): Promise<ModuleAccessResponse> {
  const api = await backend(admin.accessToken);
  const res = await api.post('/api/family/module-access', { data });
  expect(res.ok()).toBeTruthy();
  const grant = (await res.json()) as ModuleAccessResponse;
  await api.dispose();
  return grant;
}

async function openAccessDialog(page: Page, member: Member) {
  await page.goto('/family');
  await page.getByTestId(`family-access-btn-${member.userId}`).click();
  const dialog = page.getByTestId('module-access-dialog');
  await expect(dialog.getByRole('heading', { name: `Module access: ${member.name}` })).toBeVisible();
  return dialog;
}

async function pickOption(page: Page, selectTestId: string, option: string | RegExp) {
  await page.getByTestId(selectTestId).getByRole('combobox').click();
  await page.getByRole('option', { name: option }).click();
}

test.describe('Module access (Family page)', () => {
  test('admin sees an access button for children and parents but not for themselves', async ({
    authenticatedPage,
    testAuth,
  }) => {
    const child = await addMember(testAuth, 'Ema');
    const parent = await addMember(testAuth, 'Petr', 'PARENT');
    await authenticatedPage.goto('/family');

    await expect(authenticatedPage.getByTestId(`family-access-btn-${child.userId}`)).toBeVisible();
    await expect(authenticatedPage.getByTestId(`family-access-btn-${parent.userId}`)).toBeVisible();
    await expect(authenticatedPage.getByTestId(`family-access-btn-${testAuth.user!.id}`)).toHaveCount(0);
  });

  test('a member without grants shows an empty list', async ({ authenticatedPage, testAuth }) => {
    const child = await addMember(testAuth, 'Ema');
    const dialog = await openAccessDialog(authenticatedPage, child);

    await expect(dialog.getByTestId('module-access-empty')).toBeVisible();
    await expect(dialog.getByTestId('module-access-parent-info')).toHaveCount(0);

    await dialog.getByTestId('module-access-close-btn').click();
    await expect(dialog).not.toBeVisible();
  });

  test('a parent gets a note that grants do not limit them', async ({ authenticatedPage, testAuth }) => {
    const parent = await addMember(testAuth, 'Petr', 'PARENT');
    const dialog = await openAccessDialog(authenticatedPage, parent);
    await expect(dialog.getByTestId('module-access-parent-info')).toBeVisible();
  });

  test('admin grants a module with a validity window and a weekly schedule', async ({ authenticatedPage, testAuth }) => {
    const child = await addMember(testAuth, 'Ema');
    const page = authenticatedPage;
    const dialog = await openAccessDialog(page, child);

    await dialog.getByTestId('module-access-grant-btn').click();
    await pickOption(page, 'module-access-module-select', 'Learning');
    await page.getByTestId('module-access-valid-from-input').fill('2026-11-01T08:00');
    await page.getByTestId('module-access-valid-until-input').fill('2030-06-30T20:00');

    await page.getByTestId('module-access-add-window-btn').click();
    // The new window defaults to Mon–Fri 15:00–18:00; drop Friday and stay until 19:30
    await page.getByTestId('module-access-window-day-0-5').click();
    await page.getByTestId('module-access-window-end-input-0').fill('19:30');
    await expect(page.getByTestId('module-access-timezone-input')).toHaveValue('Europe/Prague');

    await page.getByTestId('module-access-form-submit-btn').click();

    const row = dialog.locator('[data-testid^="module-access-row-"]');
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('Learning');
    await expect(row).toContainText('ACCESS');
    await expect(row).toContainText('Nov 1, 2026');
    await expect(row).toContainText('Jun 30, 2030');
    await expect(row).toContainText('Mon–Thu 15:00–19:30 Europe/Prague');

    // Saved on the server exactly as the backend expects it: one schedule row per day, instants in UTC
    const api = await backend(testAuth.accessToken);
    const grants = (await (await api.get(`/api/family/module-access?userId=${child.userId}`)).json()) as ModuleAccessResponse[];
    await api.dispose();
    expect(grants).toHaveLength(1);
    expect(grants[0].moduleName).toBe('learning');
    expect(new Date(grants[0].validFrom!).toISOString()).toBe('2026-11-01T07:00:00.000Z');
    expect(grants[0].schedules!.map((s) => s.dayOfWeek).sort()).toEqual([1, 2, 3, 4]);
    expect(grants[0].schedules![0]).toMatchObject({ startTime: '15:00', endTime: '19:30', timezone: 'Europe/Prague' });
  });

  test('admin edits a grant: permission changes and the schedule is removed', async ({ authenticatedPage, testAuth }) => {
    const child = await addMember(testAuth, 'Ema');
    const grant = await grantViaApi(testAuth, {
      userId: child.userId,
      moduleName: 'expenses',
      permission: 'ACCESS',
      schedules: [6, 7].map((d) => ({ dayOfWeek: d, startTime: '09:00', endTime: '12:00', timezone: 'Europe/Prague' })),
    });
    const page = authenticatedPage;
    const dialog = await openAccessDialog(page, child);

    const row = dialog.getByTestId(`module-access-row-${grant.id}`);
    await expect(row).toContainText('Expenses');
    await expect(row).toContainText('Sat, Sun 09:00–12:00 Europe/Prague');
    await expect(dialog.getByTestId(`module-access-validity-${grant.id}`)).toHaveText('No time limit');

    await dialog.getByTestId(`module-access-edit-btn-${grant.id}`).click();
    await expect(page.getByTestId('module-access-window-start-input-0')).toHaveValue('09:00');
    await expect(page.getByTestId('module-access-module-select').getByRole('combobox')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await pickOption(page, 'module-access-permission-select', /manage/i);
    await page.getByTestId('module-access-window-remove-btn-0').click();
    await page.getByTestId('module-access-form-submit-btn').click();

    await expect(dialog.getByTestId(`module-access-permission-${grant.id}`)).toHaveText('MANAGE');
    await expect(dialog.getByTestId(`module-access-schedule-${grant.id}`)).toHaveText('Any time');
  });

  test('admin revokes a grant after confirming', async ({ authenticatedPage, testAuth }) => {
    const child = await addMember(testAuth, 'Ema');
    const grant = await grantViaApi(testAuth, { userId: child.userId, moduleName: 'learning', permission: 'ACCESS' });
    const page = authenticatedPage;
    const dialog = await openAccessDialog(page, child);

    await dialog.getByTestId(`module-access-revoke-btn-${grant.id}`).click();
    const confirm = page.getByTestId('module-access-revoke-dialog');
    await expect(confirm).toContainText('Learning');
    await confirm.getByRole('button', { name: /cancel/i }).click();
    await expect(dialog.getByTestId(`module-access-row-${grant.id}`)).toBeVisible();

    await dialog.getByTestId(`module-access-revoke-btn-${grant.id}`).click();
    await page.getByTestId('module-access-revoke-confirm-btn').click();
    await expect(dialog.getByTestId(`module-access-row-${grant.id}`)).toHaveCount(0);
    await expect(dialog.getByTestId('module-access-empty')).toBeVisible();
  });

  test('the form rejects a validity window that ends before it starts', async ({ authenticatedPage, testAuth }) => {
    const child = await addMember(testAuth, 'Ema');
    const page = authenticatedPage;
    const dialog = await openAccessDialog(page, child);

    await dialog.getByTestId('module-access-grant-btn').click();
    await page.getByTestId('module-access-valid-from-input').fill('2027-01-10T08:00');
    await page.getByTestId('module-access-valid-until-input').fill('2027-01-01T08:00');
    await page.getByTestId('module-access-form-submit-btn').click();

    await expect(page.getByTestId('module-access-form-error')).toContainText('must be after');
    await expect(page.getByTestId('module-access-form')).toBeVisible();
  });

  test('the form rejects a schedule that ends before it starts or has no days', async ({ authenticatedPage, testAuth }) => {
    const child = await addMember(testAuth, 'Ema');
    const page = authenticatedPage;
    const dialog = await openAccessDialog(page, child);

    await dialog.getByTestId('module-access-grant-btn').click();
    await page.getByTestId('module-access-add-window-btn').click();
    await page.getByTestId('module-access-window-end-input-0').fill('14:00');
    await page.getByTestId('module-access-form-submit-btn').click();
    await expect(page.getByTestId('module-access-form-error')).toContainText('must end after it starts');

    await page.getByTestId('module-access-window-end-input-0').fill('18:00');
    for (const day of [1, 2, 3, 4, 5]) {
      await page.getByTestId(`module-access-window-day-0-${day}`).click();
    }
    await page.getByTestId('module-access-form-submit-btn').click();
    await expect(page.getByTestId('module-access-form-error')).toContainText('at least one day');
  });

  test('a server error while granting is shown in the form', async ({ authenticatedPage, testAuth }) => {
    const child = await addMember(testAuth, 'Ema');
    const page = authenticatedPage;
    await page.route('**/api/family/module-access', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"status":500,"error":"Internal Server Error"}' })
        : route.continue(),
    );
    const dialog = await openAccessDialog(page, child);

    await dialog.getByTestId('module-access-grant-btn').click();
    await page.getByTestId('module-access-form-submit-btn').click();

    await expect(page.getByTestId('module-access-form-error')).toHaveText('Could not grant access (server error 500).');
    await expect(page.getByTestId('module-access-form')).toBeVisible();
  });

  test('a module and permission the member already has is not offered again', async ({ authenticatedPage, testAuth }) => {
    const child = await addMember(testAuth, 'Ema');
    await grantViaApi(testAuth, { userId: child.userId, moduleName: 'learning', permission: 'ACCESS' });
    const page = authenticatedPage;
    const dialog = await openAccessDialog(page, child);

    await dialog.getByTestId('module-access-grant-btn').click();
    await pickOption(page, 'module-access-module-select', 'Learning');
    // ACCESS is taken, so the form switches to MANAGE and disables ACCESS
    await expect(page.getByTestId('module-access-permission-select').getByRole('combobox')).toContainText('Manage');
    await page.getByTestId('module-access-permission-select').getByRole('combobox').click();
    await expect(page.getByRole('option', { name: /^access$/i })).toHaveAttribute('aria-disabled', 'true');
  });

  test('the grant button is disabled once every module and permission is granted', async ({
    authenticatedPage,
    testAuth,
  }) => {
    const child = await addMember(testAuth, 'Ema');
    for (const moduleName of ['expenses', 'learning']) {
      for (const permission of ['ACCESS', 'MANAGE'] as const) {
        await grantViaApi(testAuth, { userId: child.userId, moduleName, permission });
      }
    }
    const dialog = await openAccessDialog(authenticatedPage, child);
    await expect(dialog.locator('[data-testid^="module-access-row-"]')).toHaveCount(4);
    await expect(dialog.getByTestId('module-access-grant-btn')).toBeDisabled();
  });

  test('non-admin members do not see access controls', async ({ page, testAuth }) => {
    const parent = await addMember(testAuth, 'Petr', 'PARENT');
    const child = await addMember(testAuth, 'Ema');
    const api = await backend();
    const auth = (await (await api.post('/api/auth/login', { data: { email: parent.email, password: PASSWORD } })).json()) as AuthResponse;
    await api.dispose();
    await page.addInitScript((storage: string) => localStorage.setItem('auth-storage', storage), JSON.stringify({
      state: { accessToken: auth.accessToken, refreshToken: auth.refreshToken, user: auth.user, isAuthenticated: true },
      version: 0,
    }));

    await page.goto('/family');
    await expect(page.getByTestId(`family-member-row-${child.userId}`)).toBeVisible();
    await expect(page.locator('[data-testid^="family-access-btn-"]')).toHaveCount(0);
  });

  test("granting learning in the UI opens the kids' zoo for a child", async ({ authenticatedPage, browser, testAuth }) => {
    const child = await addMember(testAuth, 'Ema');

    await authenticatedPage.goto('/family');
    // The child signs in on a separate tablet (own browser storage)
    const tablet = await browser.newContext();
    const kids = await tablet.newPage();
    await kids.goto(new URL('/learning/', authenticatedPage.url()).toString());
    await kids.getByTestId('learning-login-email-input').fill(child.email);
    await kids.getByTestId('learning-login-password-input').fill(PASSWORD);
    await kids.getByTestId('learning-login-submit').click();
    await expect(kids.getByTestId('learning-status-closed')).toBeVisible();

    await authenticatedPage.getByTestId(`family-access-btn-${child.userId}`).click();
    await authenticatedPage.getByTestId('module-access-grant-btn').click();
    await pickOption(authenticatedPage, 'module-access-module-select', 'Learning');
    await authenticatedPage.getByTestId('module-access-form-submit-btn').click();
    await expect(authenticatedPage.locator('[data-testid^="module-access-row-"]')).toContainText('Learning');

    await kids.getByTestId('learning-status-retry').click();
    await expect(kids.getByRole('heading', { name: 'Vyber si, jak budeš vypadat' })).toBeVisible();
    await tablet.close();
  });
});
