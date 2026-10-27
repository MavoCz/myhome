import { test, expect } from '../../fixtures/page.fixture';
import { request } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

const BACKEND_PORT = process.env.TEST_BACKEND_PORT ?? '8081';

async function makeAuthApi(accessToken: string) {
  return request.newContext({
    baseURL: `http://localhost:${BACKEND_PORT}`,
    extraHTTPHeaders: { Authorization: `Bearer ${accessToken}` },
  });
}

test.describe('Family Page', () => {
  test('shows Family Members heading when authenticated', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/family');
    await expect(authenticatedPage.getByRole('heading', { name: /family members/i })).toBeVisible();
  });

  test('admin sees Add Member button', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/family');
    await expect(authenticatedPage.getByTestId('family-add-member-btn')).toBeVisible();
  });

  test('lists current user as a member', async ({ authenticatedPage, testAuth }) => {
    await authenticatedPage.goto('/family');
    await expect(authenticatedPage.getByText(testAuth.user!.displayName!)).toBeVisible();
  });

  test('can open and close Add Member dialog', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/family');

    await authenticatedPage.getByTestId('family-add-member-btn').click();
    await expect(authenticatedPage.getByTestId('add-member-dialog')).toBeVisible();
    await expect(authenticatedPage.getByRole('heading', { name: /add family member/i })).toBeVisible();

    await authenticatedPage.getByRole('button', { name: /cancel/i }).click();
    await expect(authenticatedPage.getByTestId('add-member-dialog')).not.toBeVisible();
  });

  test('Add Member dialog switches tabs', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/family');
    await authenticatedPage.getByTestId('family-add-member-btn').click();

    // Default tab: Create Account
    await expect(authenticatedPage.getByTestId('add-member-email-input')).toBeVisible();

    // Switch to Invite by Email
    await authenticatedPage.getByRole('tab', { name: /invite by email/i }).click();
    await expect(authenticatedPage.getByTestId('add-member-invite-email-input')).toBeVisible();
    await expect(authenticatedPage.getByTestId('add-member-email-input')).not.toBeVisible();
  });

  test('can add a new member via Create Account tab', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/family');
    await authenticatedPage.getByTestId('family-add-member-btn').click();

    const ts = Date.now();
    const newEmail = `member-${ts}@example.com`;

    await authenticatedPage.getByTestId('add-member-email-input').fill(newEmail);
    await authenticatedPage.getByTestId('add-member-password-input').fill('Password123!');
    await authenticatedPage.getByTestId('add-member-display-name-input').fill(`New Member ${ts}`);
    await authenticatedPage.getByTestId('add-member-submit-btn').click();

    // Dialog closes on success
    await expect(authenticatedPage.getByTestId('add-member-dialog')).not.toBeVisible();
    // New member appears in the table
    await expect(authenticatedPage.getByText(newEmail)).toBeVisible();
  });

  test('shows error on duplicate email in Add Member dialog', async ({ authenticatedPage, testAuth }) => {
    await authenticatedPage.goto('/family');
    await authenticatedPage.getByTestId('family-add-member-btn').click();

    // Use the existing user's email to trigger a conflict
    await authenticatedPage.getByTestId('add-member-email-input').fill(testAuth.email);
    await authenticatedPage.getByTestId('add-member-password-input').fill('Password123!');
    await authenticatedPage.getByTestId('add-member-display-name-input').fill('Duplicate');
    await authenticatedPage.getByTestId('add-member-submit-btn').click();

    await expect(authenticatedPage.getByTestId('add-member-error-alert')).toBeVisible();
    // Dialog stays open on error
    await expect(authenticatedPage.getByTestId('add-member-dialog')).toBeVisible();
  });

  test('admin can change a member role', async ({ authenticatedPage, testAuth }) => {
    const adminApi = await makeAuthApi(testAuth.accessToken ?? '');
    const ts = Date.now();
    const res = await adminApi.post('/api/family/members', {
      data: {
        email: `role-test-${ts}@example.com`,
        password: 'Password123!',
        displayName: `Role Test ${ts}`,
        role: 'CHILD',
      },
    });
    expect(res.ok()).toBeTruthy();
    const member = (await res.json()) as { userId: number };
    await adminApi.dispose();

    await authenticatedPage.goto('/family');

    const roleSelect = authenticatedPage.getByTestId(`family-role-select-${member.userId}`);
    await expect(roleSelect).toBeVisible();

    // MUI Select: click the combobox trigger, then pick option from portal
    await roleSelect.getByRole('combobox').click();
    // Listen before clicking so a fast response is not missed
    const roleUpdated = authenticatedPage.waitForResponse(
      (resp) => resp.url().endsWith(`/api/family/members/${member.userId}/role`) && resp.request().method() === 'PUT',
    );
    await authenticatedPage.getByRole('option', { name: 'PARENT' }).click();
    expect((await roleUpdated).ok()).toBeTruthy();
    await expect(roleSelect.getByRole('combobox')).toHaveText('PARENT');

    // The change is persisted
    await authenticatedPage.reload();
    await expect(roleSelect.getByRole('combobox')).toHaveText('PARENT');
  });

  test('admin can delete a member with confirmation', async ({ authenticatedPage, testAuth }) => {
    const adminApi = await makeAuthApi(testAuth.accessToken ?? '');
    const ts = Date.now();
    const displayName = `Delete Test ${ts}`;
    const res = await adminApi.post('/api/family/members', {
      data: {
        email: `delete-test-${ts}@example.com`,
        password: 'Password123!',
        displayName,
        role: 'CHILD',
      },
    });
    expect(res.ok()).toBeTruthy();
    const member = (await res.json()) as { userId: number };
    await adminApi.dispose();

    await authenticatedPage.goto('/family');

    await authenticatedPage.getByTestId(`family-delete-btn-${member.userId}`).click();

    const dialog = authenticatedPage.getByTestId('remove-confirm-dialog');
    await expect(dialog).toBeVisible();
    // The name is also in the member's table row, so look for it inside the dialog only
    await expect(dialog).toContainText(displayName);

    await dialog.getByRole('button', { name: /^remove$/i }).click();

    await expect(dialog).not.toBeVisible();
    await expect(authenticatedPage.getByTestId(`family-member-row-${member.userId}`)).toHaveCount(0);

    // The removal is persisted
    await authenticatedPage.reload();
    await expect(authenticatedPage.getByTestId(`family-member-row-${testAuth.user!.id}`)).toBeVisible();
    await expect(authenticatedPage.getByTestId(`family-member-row-${member.userId}`)).toHaveCount(0);
  });

  test('family page shows Color column', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/family');
    await expect(authenticatedPage.getByRole('columnheader', { name: /color/i })).toBeVisible();
  });

  test('clicking a color circle updates the member color', async ({ authenticatedPage, testAuth }) => {
    await authenticatedPage.goto('/family');
    const userId = testAuth.user!.id!;

    // The only member gets the first palette colour (blue) by default; the selected swatch has a 3px border
    const blueSwatch = authenticatedPage.getByTestId(`family-color-${userId}-4E79A7`);
    const orangeSwatch = authenticatedPage.getByTestId(`family-color-${userId}-F28E2B`);
    await expect(blueSwatch).toHaveCSS('border-top-width', '3px');
    await expect(orangeSwatch).toHaveCSS('border-top-width', '2px');

    // Listen before clicking so a fast response is not missed
    const colorUpdated = authenticatedPage.waitForResponse(
      (resp) => resp.url().endsWith(`/api/family/members/${userId}/color`) && resp.request().method() === 'PUT',
    );
    await orangeSwatch.click();
    expect((await colorUpdated).ok()).toBeTruthy();

    // The selection moves to the clicked swatch once the member list is refetched
    await expect(orangeSwatch).toHaveCSS('border-top-width', '3px');
    await expect(blueSwatch).toHaveCSS('border-top-width', '2px');

    // ...and survives a reload
    await authenticatedPage.reload();
    await expect(orangeSwatch).toHaveCSS('border-top-width', '3px');
    await expect(blueSwatch).toHaveCSS('border-top-width', '2px');
  });

  test('admin can cancel member deletion', async ({ authenticatedPage, testAuth }) => {
    const adminApi = await makeAuthApi(testAuth.accessToken ?? '');
    const ts = Date.now();
    const displayName = `Cancel Delete ${ts}`;
    const res = await adminApi.post('/api/family/members', {
      data: {
        email: `cancel-del-${ts}@example.com`,
        password: 'Password123!',
        displayName,
        role: 'CHILD',
      },
    });
    expect(res.ok()).toBeTruthy();
    const member = (await res.json()) as { userId: number };
    await adminApi.dispose();

    await authenticatedPage.goto('/family');

    await authenticatedPage.getByTestId(`family-delete-btn-${member.userId}`).click();

    const dialog = authenticatedPage.getByTestId('remove-confirm-dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible();
    await expect(authenticatedPage.getByTestId(`family-member-row-${member.userId}`)).toBeVisible();
  });
});
