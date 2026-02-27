Write Playwright E2E tests for the feature described in $ARGUMENTS (or the most recently implemented feature if no argument is given).

## What to write

Always produce **both** test files:

1. **`e2e/tests/api/<module>.spec.ts`** — pure HTTP tests, no browser
2. **`e2e/tests/ui/<module>.spec.ts`** — full-stack browser tests

If either file already exists, add new `test()` blocks to it rather than replacing it.

---

## API tests (`tests/api/`)

Import from the API fixture:
```typescript
import { test, expect } from '../../fixtures/api.fixture';
import { registerUser, loginAs, createTestUser } from '../../helpers/auth';
import type { SomeRequest } from 'myhome-common/api/generated/model';
```

**Fixtures available:**
- `api` — unauthenticated `APIRequestContext` (base URL = `http://localhost:8081`)
- `authApi` — authenticated `APIRequestContext` (Bearer token injected automatically, fresh user per test)
- `authResponse` — the `AuthResponse & { email, password }` for the `authApi` user

**Cover for every endpoint:**
- Happy path — correct status code + response shape
- Auth requirement — `401` when called without token (use `api` fixture)
- Key error cases — `400` for invalid input, `409` for conflicts, `404` for missing resources

**Example:**
```typescript
test('POST /api/things returns created item', async ({ authApi }) => {
  const res = await authApi.post('/api/things', { data: { name: 'foo' } });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.name).toBe('foo');
});

test('POST /api/things requires auth', async ({ api }) => {
  const res = await api.post('/api/things', { data: { name: 'foo' } });
  expect(res.status()).toBe(401);
});
```

---

## UI tests (`tests/ui/`)

Import from the page fixture:
```typescript
import { test, expect } from '../../fixtures/page.fixture';
```

**Fixtures available:**
- `page` — plain Playwright `Page` (unauthenticated)
- `testAuth` — `AuthResponse & { email, password }` for a fresh test user
- `authenticatedPage` — `Page` with auth tokens pre-seeded in `localStorage` (user is already logged in)

**Cover for every UI feature:**
- Page renders the relevant content (headings, key elements)
- Primary user journey: perform the action, verify the result (redirect, data shown, success message)
- Error state: submit invalid input, verify error message is displayed
- Use `authenticatedPage` for any page that requires login

**Example:**
```typescript
test('things page lists items', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/things');
  await expect(authenticatedPage.getByRole('heading', { name: /things/i })).toBeVisible();
});

test('create thing form shows error on empty name', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/things/new');
  await authenticatedPage.getByRole('button', { name: /save|create/i }).click();
  await expect(authenticatedPage.getByText(/name.*required/i)).toBeVisible();
});
```

---

## Orval types

Import model types via the `myhome-common` path alias (resolves to `common/src/api/generated/model/`):
```typescript
import type { ThingRequest, ThingResponse } from 'myhome-common/api/generated/model';
```

Import helper functions directly:
```typescript
import { createTestUser, loginAs } from '../../helpers/auth';
```

---

## Checklist before finishing

- [ ] API spec covers: happy path, 401, and at least one error case per endpoint
- [ ] UI spec covers: page renders, primary action succeeds, at least one error state
- [ ] No `.js` extensions on local imports (CJS project)
- [ ] No `import.meta.url` (use `__dirname` directly — it's available in CJS)
- [ ] Test descriptions are plain English sentences describing behaviour, not implementation
- [ ] Each test is independent — no shared mutable state between tests
