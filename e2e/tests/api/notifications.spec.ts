import * as http from 'http';
import { test, expect } from '../../fixtures/api.fixture';
import type { NotificationResponse } from 'myhome-common/api/generated/model';

const BACKEND_PORT = process.env.TEST_BACKEND_PORT ?? '8081';

/**
 * Opens an SSE connection and collects raw event data chunks for `durationMs`.
 * Returns the collected chunks joined as a single string.
 */
function collectSseData(token: string, durationMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = [];
    const req = http.get(
      {
        hostname: 'localhost',
        port: parseInt(BACKEND_PORT, 10),
        path: '/api/notifications/stream',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      },
      (res) => {
        res.on('data', (chunk: Buffer) => chunks.push(chunk.toString()));
        res.on('error', reject);
      },
    );
    req.on('error', reject);
    setTimeout(() => {
      req.destroy();
      resolve(chunks.join(''));
    }, durationMs);
  });
}

/**
 * Polls GET /api/notifications until at least `minCount` notifications appear
 * or the timeout expires. Returns the notification list.
 */
async function waitForNotifications(
  token: string,
  baseUrl: string,
  minCount: number,
  timeoutMs = 5000,
): Promise<NotificationResponse[]> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${baseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const list: NotificationResponse[] = await res.json();
    if (list.length >= minCount) {
      return list;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timed out waiting for ${minCount} notification(s)`);
}

const BASE_URL = `http://localhost:${BACKEND_PORT}`;

test.describe('Notifications API', () => {
  test('GET /api/notifications returns empty list for new user', async ({ authApi }) => {
    const res = await authApi.get('/api/notifications');
    expect(res.ok()).toBeTruthy();
    const notifications: NotificationResponse[] = await res.json();
    expect(Array.isArray(notifications)).toBeTruthy();
  });

  test('adding a family member delivers SSE event with serializable createdAt', async ({
    api,
    authResponse,
  }) => {
    const parentToken = authResponse.accessToken!;

    // Start collecting SSE events *before* the action that triggers the notification
    const ssePromise = collectSseData(parentToken, 3000);

    // Give the SSE connection a moment to establish before triggering the event
    await new Promise((r) => setTimeout(r, 300));

    // Admin parent adds a child member — this triggers a MEMBER_ADDED notification
    const memberTag = `child-${Date.now()}`;
    const addRes = await api.post('/api/family/members', {
      headers: { Authorization: `Bearer ${parentToken}` },
      data: {
        email: `${memberTag}@example.com`,
        password: 'Password123!',
        displayName: `Child ${memberTag}`,
        role: 'CHILD',
      },
    });
    expect(addRes.ok()).toBeTruthy();

    // Wait for SSE collection window to close
    const sseData = await ssePromise;

    // The SSE stream should contain at least one "notification" event
    // Spring SSE format: "event:notification\n" (no space after colon)
    expect(sseData).toContain('event:notification');

    // Extract the JSON payload from the SSE data line that contains createdAt
    const dataLine = sseData
      .split('\n')
      .find((line) => line.startsWith('data:') && line.includes('createdAt'));
    expect(dataLine).toBeTruthy();

    const json = JSON.parse(dataLine!.replace(/^data:\s*/, ''));
    // createdAt must be a valid ISO-8601 string (not missing or "[object Object]")
    expect(typeof json.createdAt).toBe('string');
    expect(new Date(json.createdAt).getTime()).not.toBeNaN();
    expect(json.type).toBeTruthy();
  });

  test('GET /api/notifications returns notification after member add', async ({ api, authResponse }) => {
    const parentToken = authResponse.accessToken!;

    const memberTag = `child-notif-${Date.now()}`;
    const addRes = await api.post('/api/family/members', {
      headers: { Authorization: `Bearer ${parentToken}` },
      data: {
        email: `${memberTag}@example.com`,
        password: 'Password123!',
        displayName: `Child ${memberTag}`,
        role: 'CHILD',
      },
    });
    expect(addRes.ok()).toBeTruthy();

    // Wait for async Modulith event to process the notification
    const notifications = await waitForNotifications(parentToken, BASE_URL, 1);
    expect(notifications.length).toBeGreaterThan(0);

    const notif = notifications[0];
    expect(typeof notif.createdAt).toBe('string');
    expect(new Date(notif.createdAt!).getTime()).not.toBeNaN();
  });

  test('mark notification as read', async ({ api, authResponse }) => {
    const parentToken = authResponse.accessToken!;

    // Create a notification by adding a member
    const memberTag = `child-read-${Date.now()}`;
    await api.post('/api/family/members', {
      headers: { Authorization: `Bearer ${parentToken}` },
      data: {
        email: `${memberTag}@example.com`,
        password: 'Password123!',
        displayName: `Child ${memberTag}`,
        role: 'CHILD',
      },
    });

    const notifications = await waitForNotifications(parentToken, BASE_URL, 1);
    const unread = notifications.filter((n) => !n.read);
    expect(unread.length).toBeGreaterThan(0);

    const id = unread[0].id!;
    const readRes = await api.post(`/api/notifications/${id}/read`, {
      headers: { Authorization: `Bearer ${parentToken}` },
    });
    expect(readRes.ok()).toBeTruthy();

    const afterRes = await api.get('/api/notifications', {
      headers: { Authorization: `Bearer ${parentToken}` },
    });
    const after: NotificationResponse[] = await afterRes.json();
    const marked = after.find((n) => n.id === id);
    expect(marked?.read).toBe(true);
  });

  test('mark all notifications as read', async ({ api, authResponse }) => {
    const parentToken = authResponse.accessToken!;

    // Add two members to generate two notifications
    for (let i = 0; i < 2; i++) {
      const tag = `child-readall-${i}-${Date.now()}`;
      await api.post('/api/family/members', {
        headers: { Authorization: `Bearer ${parentToken}` },
        data: {
          email: `${tag}@example.com`,
          password: 'Password123!',
          displayName: `Child ${tag}`,
          role: 'CHILD',
        },
      });
    }

    // Wait for both async events to process
    await waitForNotifications(parentToken, BASE_URL, 2);

    const readAllRes = await api.post('/api/notifications/read-all', {
      headers: { Authorization: `Bearer ${parentToken}` },
    });
    expect(readAllRes.ok()).toBeTruthy();

    const afterRes = await api.get('/api/notifications', {
      headers: { Authorization: `Bearer ${parentToken}` },
    });
    const after: NotificationResponse[] = await afterRes.json();
    const unread = after.filter((n) => !n.read);
    expect(unread.length).toBe(0);
  });
});
