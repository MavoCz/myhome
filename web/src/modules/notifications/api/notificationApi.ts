import { customFetch } from 'common';
import type { Notification } from '../../../stores/notificationStore';

export function fetchNotifications(): Promise<Notification[]> {
  return customFetch<Notification[]>('/api/notifications', { method: 'GET' });
}

export function markNotificationAsRead(id: number): Promise<void> {
  return customFetch<void>(`/api/notifications/${id}/read`, { method: 'POST' });
}

export function markAllNotificationsAsRead(): Promise<void> {
  return customFetch<void>('/api/notifications/read-all', { method: 'POST' });
}
