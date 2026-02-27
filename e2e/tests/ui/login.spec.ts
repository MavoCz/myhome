import { test, expect } from '../../fixtures/page.fixture';

test.describe('Login UI', () => {
  test('displays login form', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel(/email/i).fill('nobody@example.com');
    await page.locator('input[type="password"]').fill('WrongPassword!');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('logs in with valid credentials and redirects', async ({ page, testAuth }) => {
    await page.goto('/');

    await page.getByLabel(/email/i).fill(testAuth.email);
    await page.locator('input[type="password"]').fill(testAuth.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    // After successful login the user should leave the login page
    await expect(page).not.toHaveURL(/login/i);
  });

  test('pre-seeded tokens keep user logged in', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    // Should NOT redirect to login — already authenticated via Zustand auth-storage
    await expect(authenticatedPage).not.toHaveURL(/login/i);
  });

  test('register flow creates account and redirects', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: /sign up/i }).click();
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();

    const ts = Date.now();
    await page.getByLabel('Display Name').fill('UI User');
    await page.getByLabel('Family Name').fill(`UI Family ${ts}`);
    await page.getByLabel(/email/i).fill(`ui-reg-${ts}@example.com`);
    await page.locator('input[type="password"]').fill('Password123!');
    await page.getByRole('button', { name: /create account/i }).click();

    // After registration the user should be authenticated and off the register page
    await expect(page).not.toHaveURL(/register|login/i);
  });
});
