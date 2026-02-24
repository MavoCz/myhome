import { useEffect, useRef } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { useAuthStore } from '../../../stores/authStore';
import { useNotificationStore, type Notification } from '../../../stores/notificationStore';
import { fetchNotifications } from '../api/notificationApi';

export function useNotificationSSE() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Load existing notifications on mount
    fetchNotifications().then((notifications) => {
      useNotificationStore.getState().setNotifications(notifications);
    }).catch(() => {
      // Silently fail — notifications will load when SSE connects
    });

    const controller = new AbortController();
    abortRef.current = controller;

    fetchEventSource('/api/notifications/stream', {
      signal: controller.signal,
      openWhenHidden: false,
      async fetch(input, init) {
        const token = useAuthStore.getState().accessToken;
        const headers = new Headers(init?.headers);
        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        return globalThis.fetch(input, { ...init, headers });
      },
      onopen: async (response) => {
        if (response.status === 401) {
          // Try refreshing tokens
          const refreshToken = useAuthStore.getState().refreshToken;
          if (refreshToken) {
            try {
              const res = await globalThis.fetch('/api/auth/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
              });
              if (res.ok) {
                const data = await res.json();
                useAuthStore.getState().setAuth(data.accessToken, data.refreshToken, data.user);
              } else {
                useAuthStore.getState().clearAuth();
              }
            } catch {
              useAuthStore.getState().clearAuth();
            }
          }
          throw new Error('Unauthorized — will retry');
        }
      },
      onmessage: (event) => {
        if (event.event === 'notification') {
          try {
            const payload = JSON.parse(event.data) as Notification;
            useNotificationStore.getState().addNotification({
              ...payload,
              read: false,
            });
          } catch {
            // Ignore malformed messages
          }
        }
        // Ignore 'connected' and 'heartbeat' events
      },
      onerror: () => {
        // Return undefined to let the library retry with backoff
        return undefined;
      },
    }).catch(() => {
      // Stream ended — expected on unmount
    });

    return () => {
      controller.abort();
      abortRef.current = null;
    };
  }, [isAuthenticated]);
}
