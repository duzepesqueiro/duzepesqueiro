import { io } from 'socket.io-client';
import api from './api';

const configuredBaseUrl =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL
    : '';

const isUnifiedProxyAccess =
  typeof window !== 'undefined' &&
  (window.location.port === '' || window.location.port === '80' || window.location.port === '443');

const fallbackBaseUrl =
  isUnifiedProxyAccess && typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080';

const baseUrl = (configuredBaseUrl || fallbackBaseUrl).replace(/\/api\/?$/, '');

export async function listNotifications(params = {}) {
  const response = await api.get('/notifications', { params });
  return response?.data;
}

export async function getUnreadNotificationCount() {
  const response = await api.get('/notifications/unread-count');
  return response?.data;
}

export async function markNotificationsAsRead(ids) {
  const response = await api.patch('/notifications/read', { ids });
  return response?.data;
}

export async function markAllNotificationsAsRead() {
  const response = await api.patch('/notifications/read-all');
  return response?.data;
}

export function connectNotificationsSocket() {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('auth_token') || localStorage.getItem('auth_access_token')
      : null;

  if (!token) {
    return null;
  }

  return io(`${baseUrl}/notifications`, {
    transports: ['polling', 'websocket'],
    auth: { token: `Bearer ${token}` },
  });
}
