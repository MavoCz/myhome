import { test, expect } from '../../fixtures/page.fixture';

test.describe('Login UI', () => {
  test('displays login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByTestId('login-email-input')).toBeVisible();
    await expect(page.getByTestId('login-password-input')).toBeVisible();
  });

  test('shows error on empty submit', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('login-submit-btn').click();
    await expect(page.getByTestId('login-error-alert')).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByTestId('login-email-input').fill('nobody@example.com');
    await page.getByTestId('login-password-input').fill('WrongPassword!');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByTestId('login-error-alert')).toBeVisible();
  });

  test('logs in with valid credentials and redirects to home', async ({ page, testAuth }) => {
    await page.goto('/login');

    await page.getByTestId('login-email-input').fill(testAuth.email);
    await page.getByTestId('login-password-input').fill(testAuth.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/home/i);
  });

  test('pre-seeded tokens keep user logged in', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/');
    await expect(authenticatedPage).not.toHaveURL(/login/i);
    await expect(authenticatedPage).toHaveURL(/home/i);
  });

  test('navigates to register page from login', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /sign up/i }).click();
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
  });
});

test.describe('Register UI', () => {
  test('displays register form', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
    await expect(page.getByTestId('register-display-name-input')).toBeVisible();
    await expect(page.getByTestId('register-family-name-input')).toBeVisible();
    await expect(page.getByTestId('register-email-input')).toBeVisible();
    await expect(page.getByTestId('register-password-input')).toBeVisible();
  });

  test('shows error on short password', async ({ page }) => {
    await page.goto('/register');

    await page.getByTestId('register-display-name-input').fill('Test User');
    await page.getByTestId('register-family-name-input').fill('Test Family');
    await page.getByTestId('register-email-input').fill('test@example.com');
    await page.getByTestId('register-password-input').fill('short');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByTestId('register-error-alert')).toBeVisible();
  });

  test('register flow creates account and redirects to home', async ({ page }) => {
    await page.goto('/register');

    const ts = Date.now();
    await page.getByTestId('register-display-name-input').fill('UI User');
    await page.getByTestId('register-family-name-input').fill(`UI Family ${ts}`);
    await page.getByTestId('register-email-input').fill(`ui-reg-${ts}@example.com`);
    await page.getByTestId('register-password-input').fill('Password123!');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page).toHaveURL(/home/i);
  });

  test('navigates back to login from register', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('link', { name: /sign in/i }).click();
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });
});
