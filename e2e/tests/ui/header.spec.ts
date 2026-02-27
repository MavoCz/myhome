import { test, expect } from '../../fixtures/page.fixture';

test.describe('Header (desktop)', () => {
  test('renders app title', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/home');
    await expect(authenticatedPage.getByText('Family App')).toBeVisible();
  });

  test('shows user display name and family role chip', async ({ authenticatedPage, testAuth }) => {
    await authenticatedPage.goto('/home');
    const familyInfo = authenticatedPage.getByTestId('header-family-info');
    await expect(familyInfo).toContainText(testAuth.user!.displayName!);
    await expect(familyInfo).toContainText(testAuth.user!.familyRole!);
  });

  test('home button navigates to /home', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/family');
    await expect(authenticatedPage).toHaveURL(/family/);

    await authenticatedPage.getByTestId('header-home-btn').click();
    await expect(authenticatedPage).toHaveURL(/home/);
  });

  test('family info area navigates to /family', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/home');
    await authenticatedPage.getByTestId('header-family-info').click();
    await expect(authenticatedPage).toHaveURL(/family/);
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

  test('shows hamburger button and hides desktop controls', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/home');
    await expect(authenticatedPage.getByTestId('header-menu-btn')).toBeVisible();
    await expect(authenticatedPage.getByTestId('header-logout-btn')).not.toBeVisible();
    await expect(authenticatedPage.getByTestId('header-home-btn')).not.toBeVisible();
  });

  test('hamburger opens drawer with navigation options', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/home');
    await authenticatedPage.getByTestId('header-menu-btn').click();

    await expect(authenticatedPage.getByTestId('header-mobile-home-btn')).toBeVisible();
    await expect(authenticatedPage.getByTestId('header-mobile-theme-btn')).toBeVisible();
    await expect(authenticatedPage.getByTestId('header-mobile-logout-btn')).toBeVisible();
  });

  test('mobile logout clears auth and redirects to login', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/home');
    await authenticatedPage.getByTestId('header-menu-btn').click();
    await authenticatedPage.getByTestId('header-mobile-logout-btn').click();

    await expect(authenticatedPage).toHaveURL(/login/);
  });

  test('mobile home button navigates to /home', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/family');
    await authenticatedPage.getByTestId('header-menu-btn').click();
    await authenticatedPage.getByTestId('header-mobile-home-btn').click();
    await expect(authenticatedPage).toHaveURL(/home/);
  });
});
