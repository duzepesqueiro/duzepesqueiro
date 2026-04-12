import { io } from 'socket.io-client';

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

let socketInstance = null;

export const connectInventorySocket = () => {
  if (socketInstance) {
    return socketInstance;
  }
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!token) {
    return null;
  }
  socketInstance = io(`${baseUrl}/inventory`, {
    transports: ['polling', 'websocket'],
    auth: { token: `Bearer ${token}` },
  });
  return socketInstance;
};

export const disconnectInventorySocket = () => {
  if (!socketInstance) {
    return;
  }
  socketInstance.disconnect();
  socketInstance = null;
};

export const onInventoryEvent = (eventName, handler) => {
  const socket = connectInventorySocket();
  if (!socket) {
    return () => {};
  }
  socket.on(eventName, handler);
  return () => {
    socket.off(eventName, handler);
  };
};
