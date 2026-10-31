import { test, expect } from '../../fixtures/page.fixture';
import { request, type Page } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import type { AuthResponse, MyZooResponse } from 'myhome-common/api/generated/model';

dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

const BACKEND_PORT = process.env.TEST_BACKEND_PORT ?? '8081';
const PASSWORD = 'Password123!';

async function backend(token?: string) {
  return request.newContext({
    baseURL: `http://localhost:${BACKEND_PORT}`,
    extraHTTPHeaders: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

interface Child {
  userId: number;
  email: string;
  name: string;
}

/** Adds a CHILD to the parent's family and (by default) grants the learning module. */
async function addChild(parent: AuthResponse, name: string, withAccess = true): Promise<Child> {
  const api = await backend(parent.accessToken);
  const email = `${name.toLowerCase()}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  const member = await (
    await api.post('/api/family/members', { data: { email, password: PASSWORD, displayName: name, role: 'CHILD' } })
  ).json();
  if (withAccess) {
    await api.post('/api/family/module-access', {
      data: { userId: member.userId, familyId: parent.user!.familyId, moduleName: 'learning', permission: 'ACCESS' },
    });
  }
  await api.dispose();
  return { userId: member.userId, email, name };
}

async function childToken(child: Child): Promise<string> {
  const api = await backend();
  const auth = await (await api.post('/api/auth/login', { data: { email: child.email, password: PASSWORD } })).json();
  await api.dispose();
  return auth.accessToken;
}

async function serverZoo(child: Child): Promise<MyZooResponse> {
  const api = await backend(await childToken(child));
  const zoo = await (await api.get('/api/learning/zoo')).json();
  await api.dispose();
  return zoo;
}

/** What a parent does on the tablet: types the child's account into the kids' app. */
async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.getByTestId('learning-login-email-input').fill(email);
  await page.getByTestId('learning-login-password-input').fill(password);
  await page.getByTestId('learning-login-submit').click();
}

/** Signs a new child in and creates their zoo with the default avatar. */
async function startZoo(page: Page, child: Child) {
  await signIn(page, child.email);
  await expect(page.getByRole('heading', { name: 'Vyber si, jak budeš vypadat' })).toBeVisible();
  await page.getByTestId('avatar-save-btn').click();
  await expect(page.getByRole('heading', { name: `Ahoj, ${child.name}!` })).toBeVisible();
}

/** Posts the message the sčítání page sends after a problem solved without mistakes, carrying over ten. */
async function solveAdditionProblem(page: Page) {
  await page.getByTestId('home-exercise-btn-scitani').click();
  const frame = await (await page.locator('iframe').elementHandle())!.contentFrame();
  await frame!.waitForLoadState();
  await frame!.evaluate(() =>
    window.parent.postMessage(
      { source: 'skolni-zoo-exercise', type: 'reward', exercise: 'scitani', event: { kind: 'problem', mistakes: 0, carry: true } },
      '*',
    ),
  );
}

test.describe('Školní zoo (kids app)', () => {
  test('shows the sign-in form on a tablet nobody has used yet', async ({ page }) => {
    await page.goto('/learning/');
    await expect(page.getByRole('heading', { name: 'Přihlášení' })).toBeVisible();
    await expect(page.getByTestId('learning-login-submit')).toBeDisabled();
  });

  test('a signed-in child picks an avatar and gets a new zoo with starting coins', async ({ page, testAuth }) => {
    const child = await addChild(testAuth, 'Ema');
    await page.goto('/learning/');
    await signIn(page, child.email);

    await expect(page.getByRole('heading', { name: 'Vyber si, jak budeš vypadat' })).toBeVisible();
    await page.getByTestId('avatar-hair-4').click();
    await page.getByTestId('avatar-save-btn').click();

    await expect(page.getByRole('heading', { name: 'Ahoj, Ema!' })).toBeVisible();
    await expect(page.getByTestId('home-wallet')).toHaveText('40');
    await expect.poll(async () => (await serverZoo(child)).version).toBe(1);
  });

  test('a wrong password shows an error', async ({ page, testAuth }) => {
    const child = await addChild(testAuth, 'Ema');
    await page.goto('/learning/');
    await signIn(page, child.email, 'WrongPassword1!');
    await expect(page.getByTestId('learning-login-error')).toHaveText('E-mail nebo heslo nesedí.');
  });

  test("a parent's account cannot be used in the kids' app", async ({ page, testAuth }) => {
    await page.goto('/learning/');
    await signIn(page, testAuth.email, testAuth.password);
    await expect(page.getByTestId('learning-login-error')).toHaveText('Tohle je účet rodiče. Zoo mají jen děti.');
  });

  test('a child solves a subtraction problem with a carry on the real page and earns coins', async ({ page, testAuth }) => {
    const child = await addChild(testAuth, 'Ema');
    await page.goto('/learning/');
    await startZoo(page, child);

    await page.getByTestId('home-exercise-btn-odcitani').click();
    const frame = page.frameLocator('iframe');
    await frame.getByRole('radio', { name: 'S přechodem' }).click();
    const number = async (row: string) =>
      Number((await frame.locator(`.d.${row}`).allTextContents()).reverse().join(''));
    const answer = String((await number('a')) - (await number('b')));

    for (const [i, digit] of [...answer].reverse().entries()) {
      await expect(frame.locator(`#res-${i}.active`)).toBeVisible();
      await frame.getByRole('button', { name: digit, exact: true }).click();
    }

    await expect(page.getByText('Příklad bez chyby')).toBeVisible();
    await page.getByRole('button', { name: /domů/i }).click();
    // 40 to start + 3 for the problem + 5 daily bonus
    await expect(page.getByTestId('home-wallet')).toHaveText('48');
  });

  test('coins earned in an exercise are saved on the server and show up on another tablet', async ({
    page,
    browser,
    testAuth,
  }) => {
    const child = await addChild(testAuth, 'Ema');
    await page.goto('/learning/');
    await startZoo(page, child);

    await solveAdditionProblem(page);
    await expect(page.getByText('Příklad bez chyby')).toBeVisible();
    await page.getByRole('button', { name: /domů/i }).click();
    // 40 to start + 3 for the problem + 5 daily bonus
    await expect(page.getByTestId('home-wallet')).toHaveText('48');
    await expect.poll(async () => (await serverZoo(child)).state?.coins).toBe(48);

    const otherTablet = await browser.newContext({ baseURL: page.url().replace(/\/learning\/.*$/, '') });
    const other = await otherTablet.newPage();
    await other.goto('/learning/');
    await signIn(other, child.email);
    await expect(other.getByRole('heading', { name: 'Ahoj, Ema!' })).toBeVisible();
    await expect(other.getByTestId('home-wallet')).toHaveText('48');
    await otherTablet.close();
  });

  test('the zoo is still there after the app is reopened', async ({ page, testAuth }) => {
    const child = await addChild(testAuth, 'Ema');
    await page.goto('/learning/');
    await startZoo(page, child);

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Ahoj, Ema!' })).toBeVisible();
    await expect(page.getByTestId('home-wallet')).toHaveText('40');
  });

  test('children on the same tablet switch with a tap and see each other’s zoo', async ({ page, testAuth }) => {
    const ema = await addChild(testAuth, 'Ema');
    const ela = await addChild(testAuth, 'Ela');
    await page.goto('/learning/');
    await startZoo(page, ema);

    await page.getByTestId('home-switch-btn').click();
    await page.getByTestId('profile-add-btn').click();
    await startZoo(page, ela);
    await expect(page.getByTestId(`home-visit-btn-${ema.userId}`)).toContainText('Návštěva: Ema');

    await page.getByTestId('home-switch-btn').click();
    await expect(page.getByTestId(`profile-card-${ema.userId}`)).toBeVisible();
    await page.getByTestId(`profile-pick-${ema.userId}`).click();
    await expect(page.getByRole('heading', { name: 'Ahoj, Ema!' })).toBeVisible();
  });

  test('a child without learning access sees that the zoo is closed', async ({ page, testAuth }) => {
    const child = await addChild(testAuth, 'Ema', false);
    await page.goto('/learning/');
    await signIn(page, child.email);
    await expect(page.getByTestId('learning-status-closed')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Zoo má přestávku' })).toBeVisible();
  });

  test('bonus coins from a parent arrive in the zoo', async ({ page, testAuth }) => {
    const child = await addChild(testAuth, 'Ema');
    await page.goto('/learning/');
    await startZoo(page, child);
    await expect.poll(async () => (await serverZoo(child)).version).toBe(1);

    const parentApi = await backend(testAuth.accessToken);
    await parentApi.post('/api/learning/grants', { data: { userId: child.userId, amount: 15, note: 'za úkoly' } });
    await parentApi.dispose();

    await page.reload();
    await expect(page.getByText('Bonus od rodičů: za úkoly')).toBeVisible();
    await expect(page.getByTestId('home-wallet')).toHaveText('55');
  });

  test('an elephant moves in with the giraffe in the savanna and eats salad', async ({ page, testAuth }) => {
    const child = await addChild(testAuth, 'Ema');
    await page.goto('/learning/');
    await startZoo(page, child);
    await expect.poll(async () => (await serverZoo(child)).version).toBe(1);
    const parentApi = await backend(testAuth.accessToken);
    await parentApi.post('/api/learning/grants', { data: { userId: child.userId, amount: 60, note: 'na slona' } });
    await parentApi.dispose();
    await page.reload();
    await expect(page.getByTestId('home-wallet')).toHaveText('100');

    await page.getByTestId('home-my-zoo-btn').click();
    await expect(page.locator('.zoo-loading')).toBeHidden({ timeout: 20_000 });
    const tapPen = () => page.mouse.click(1000, 300);

    await page.getByRole('radio', { name: 'Stavění' }).click();
    await page.getByRole('tab', { name: 'Výběhy a cesty' }).click();
    await page.getByRole('button', { name: /Výběh savana/ }).click();
    await expect(page.locator('.shop-hint')).toContainText('Pro žirafy a slony');
    await tapPen();

    await page.getByRole('tab', { name: 'Zvířata' }).click();
    await page.getByRole('button', { name: /Slon/ }).click();
    await expect(page.locator('.shop-hint')).toContainText('Bydlí ve výběhu savana. Má rád salát.');
    await tapPen();

    // feed it while it is alone: a tap feeds whichever animal is under the finger, and they wander
    await page.getByRole('radio', { name: 'Procházka' }).click();
    await tapPen();
    await expect(page.getByText('Slon si pochutnává.')).toBeVisible({ timeout: 20_000 });
    await tapPen();
    await expect(page.getByText('Slon už je najedený. Zkus to zase později.')).toBeVisible({ timeout: 20_000 });

    await page.getByRole('radio', { name: 'Stavění' }).click();
    await page.getByRole('button', { name: /Žirafa/ }).click();
    await tapPen();
    await expect
      .poll(async () => ((await serverZoo(child)).state as { animals: { species: string }[] }).animals.map(a => a.species).sort())
      .toEqual(['elephant', 'giraffe']);
    const { animals } = (await serverZoo(child)).state as { animals: { penId: string }[] };
    expect(animals[0].penId).toBe(animals[1].penId);
  });
});

test.describe('Learning page (parents)', () => {
  test('appears as a module on the home page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/home');
    await expect(authenticatedPage.getByText('Learning').first()).toBeVisible();
  });

  test('lists each child with their coins and finished exercises', async ({ authenticatedPage, testAuth }) => {
    const child = await addChild(testAuth, 'Ema');
    const api = await backend(await childToken(child));
    await api.put('/api/learning/zoo', {
      data: { version: 0, state: { schema: 1, coins: 48, earned: 8, objects: [], animals: [] } },
    });
    await api.post('/api/learning/results', {
      data: {
        results: [
          { clientId: 'a', exercise: 'scitani', event: { kind: 'problem', mistakes: 0, carry: true }, coins: 3, solvedAt: new Date().toISOString() },
          { clientId: 'b', exercise: 'scitani', event: { kind: 'problem', mistakes: 1, carry: false }, coins: 1, solvedAt: new Date().toISOString() },
        ],
      },
    });
    await api.dispose();

    await authenticatedPage.goto('/learning-progress');
    await expect(authenticatedPage.getByRole('heading', { name: 'Learning' })).toBeVisible();
    const card = authenticatedPage.getByTestId(`learning-child-${child.userId}`);
    await expect(card).toContainText('Ema');
    await expect(authenticatedPage.getByTestId(`learning-child-coins-${child.userId}`)).toHaveText('48 coins');
    const days = authenticatedPage.getByTestId(`learning-child-days-${child.userId}`);
    await expect(days).toContainText('Sčítání pod sebou');
    await expect(days.getByRole('cell', { name: '2', exact: true })).toBeVisible();
  });

  test('a child who never opened the zoo gets a hint instead of numbers', async ({ authenticatedPage, testAuth }) => {
    const child = await addChild(testAuth, 'Ela');
    await authenticatedPage.goto('/learning-progress');
    await expect(authenticatedPage.getByTestId(`learning-child-${child.userId}`)).toContainText("Hasn't opened the zoo yet");
  });

  test('giving bonus coins lists them as waiting until the child opens the zoo', async ({ authenticatedPage, testAuth }) => {
    const child = await addChild(testAuth, 'Ema');
    const api = await backend(await childToken(child));
    await api.put('/api/learning/zoo', { data: { version: 0, state: { schema: 1, coins: 40, earned: 0, objects: [], animals: [] } } });
    await api.dispose();

    await authenticatedPage.goto('/learning-progress');
    await authenticatedPage.getByTestId(`learning-bonus-amount-${child.userId}`).fill('15');
    await authenticatedPage.getByTestId(`learning-bonus-note-${child.userId}`).fill('za úkoly');
    await authenticatedPage.getByTestId(`learning-bonus-btn-${child.userId}`).click();

    await expect(authenticatedPage.getByTestId(`learning-bonus-sent-${child.userId}`)).toBeVisible();
    const table = authenticatedPage.getByTestId('learning-grants-table');
    await expect(table).toContainText('za úkoly');
    await expect(table).toContainText('Waiting');
  });

  test('an invalid bonus amount cannot be sent', async ({ authenticatedPage, testAuth }) => {
    const child = await addChild(testAuth, 'Ema');
    const api = await backend(await childToken(child));
    await api.put('/api/learning/zoo', { data: { version: 0, state: { schema: 1, coins: 40, earned: 0, objects: [], animals: [] } } });
    await api.dispose();

    await authenticatedPage.goto('/learning-progress');
    await authenticatedPage.getByTestId(`learning-bonus-amount-${child.userId}`).fill('0');
    await expect(authenticatedPage.getByTestId(`learning-bonus-btn-${child.userId}`)).toBeDisabled();
  });

  test('links to the kids’ app', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/learning-progress');
    await expect(authenticatedPage.getByTestId('learning-open-zoo-btn')).toHaveAttribute('href', '/learning/');
  });
});
