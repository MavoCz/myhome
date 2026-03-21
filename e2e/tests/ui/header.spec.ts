import { test, expect } from '../../fixtures/page.fixture';

test.describe('Header (desktop)', () => {
  test('renders app title', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/home');
    await expect(authenticatedPage.getByText('Family App')).toBeVisible();
  });

  test('shows user chip with display name and role', async ({ authenticatedPage, testAuth }) => {
    await authenticatedPage.goto('/home');
    const userChip = authenticatedPage.getByTestId('header-user-chip');
    await expect(userChip).toContainText(testAuth.user!.displayName!);
    await expect(userChip).toContainText(testAuth.user!.familyRole!);
  });

  test('home button navigates to /home', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/family');
    await expect(authenticatedPage).toHaveURL(/family/);

    await authenticatedPage.getByTestId('header-home-btn').click();
    await expect(authenticatedPage).toHaveURL(/home/);
  });

  test('inline nav shows module buttons', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/home');
    await expect(authenticatedPage.getByTestId('header-nav-family')).toBeVisible();
    await expect(authenticatedPage.getByTestId('header-nav-expenses')).toBeVisible();
  });

  test('module nav button navigates to module', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/home');
    await authenticatedPage.getByTestId('header-nav-expenses').click();
    await expect(authenticatedPage).toHaveURL(/expenses/);
  });

  test('theme toggle button is clickable', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/home');
    const toggleBtn = authenticatedPage.getByTestId('header-theme-toggle-btn');
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();
    await expect(toggleBtn).toBeVisible();
  });

  test('logout button clears auth and redirects to login', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/home');

    await authenticatedPage.getByTestId('header-logout-btn').click();

    await expect(authenticatedPage).toHaveURL(/login/);
    await expect(authenticatedPage.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('notification bell is visible', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/home');
    await expect(authenticatedPage.getByTestId('notif-bell-btn')).toBeVisible();
  });

  test('notification bell opens popover with Notifications heading', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/home');
    await authenticatedPage.getByTestId('notif-bell-btn').click();
    await expect(authenticatedPage.getByRole('heading', { name: /^notifications$/i })).toBeVisible();
  });
});

test.describe('Header (mobile)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('shows overflow button and hides desktop controls', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/home');
    await expect(authenticatedPage.getByTestId('header-overflow-btn')).toBeVisible();
    await expect(authenticatedPage.getByTestId('header-logout-btn')).not.toBeVisible();
    await expect(authenticatedPage.getByTestId('header-home-btn')).not.toBeVisible();
  });

  test('overflow menu shows theme and logout options', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/home');
    await authenticatedPage.getByTestId('header-overflow-btn').click();

    await expect(authenticatedPage.getByTestId('header-overflow-theme-btn')).toBeVisible();
    await expect(authenticatedPage.getByTestId('header-overflow-logout-btn')).toBeVisible();
  });

  test('mobile logout clears auth and redirects to login', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/home');
    await authenticatedPage.getByTestId('header-overflow-btn').click();
    await authenticatedPage.getByTestId('header-overflow-logout-btn').click();

    await expect(authenticatedPage).toHaveURL(/login/);
  });

  test('bottom nav is visible on mobile', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/home');
    await expect(authenticatedPage.getByTestId('bottom-nav')).toBeVisible();
  });

  test('bottom nav home navigates to /home', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/family');
    await authenticatedPage.getByTestId('bottom-nav-home').click();
    await expect(authenticatedPage).toHaveURL(/home/);
  });
});

test.describe('Module tabs', () => {
  test('shows tabs on expenses page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/expenses');
    await expect(authenticatedPage.getByTestId('module-tabs')).toBeVisible();
    await expect(authenticatedPage.getByTestId('module-tab-list')).toBeVisible();
    await expect(authenticatedPage.getByTestId('module-tab-monthly-summary')).toBeVisible();
  });

  test('does not show tabs on home page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/home');
    await expect(authenticatedPage.getByTestId('module-tabs')).not.toBeVisible();
  });

  test('tab navigation works', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/expenses');
    await authenticatedPage.getByTestId('module-tab-monthly-summary').click();
    await expect(authenticatedPage).toHaveURL(/expenses\/summary/);
  });
});
