import type { APIRequestContext } from '@playwright/test';
import type { AuthResponse, LoginRequest, RegisterRequest } from 'myhome-common/api/generated/model';

export async function registerUser(
  api: APIRequestContext,
  req: RegisterRequest,
): Promise<AuthResponse> {
  const res = await api.post('/api/auth/register', { data: req });
  if (!res.ok()) {
    throw new Error(`Register failed: ${res.status()} ${await res.text()}`);
  }
  return res.json() as Promise<AuthResponse>;
}

export async function loginAs(
  api: APIRequestContext,
  credentials: LoginRequest,
): Promise<AuthResponse> {
  const res = await api.post('/api/auth/login', { data: credentials });
  if (!res.ok()) {
    throw new Error(`Login failed: ${res.status()} ${await res.text()}`);
  }
  return res.json() as Promise<AuthResponse>;
}

export async function logout(api: APIRequestContext, refreshToken: string): Promise<void> {
  await api.post('/api/auth/logout', { data: { refreshToken } });
}

/** Creates a unique test user and returns their auth tokens plus credentials. */
export async function createTestUser(
  api: APIRequestContext,
  suffix?: string,
): Promise<AuthResponse & { email: string; password: string }> {
  const tag = suffix ?? Date.now().toString();
  const email = `test-${tag}@example.com`;
  const password = 'Password123!';

  const auth = await registerUser(api, {
    email,
    password,
    displayName: `Test User ${tag}`,
    familyName: `Family ${tag}`,
  });

  return { ...auth, email, password };
}
