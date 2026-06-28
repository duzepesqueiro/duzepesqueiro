import axios from "axios";

const configuredBaseURL =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL
    : '';

const isUnifiedProxyAccess =
  typeof window !== 'undefined' &&
  (window.location.port === '' || window.location.port === '80' || window.location.port === '443');

const baseURL = configuredBaseURL || (isUnifiedProxyAccess ? window.location.origin : "http://localhost:8080");

const api = axios.create({
  baseURL,
  withCredentials: true,
});

const refreshClient = axios.create({ baseURL, withCredentials: true });
let isRefreshing = false;
let pendingRefreshResolvers = [];

const clearSessionAndRedirect = () => {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_access_token');
  localStorage.removeItem('auth_refresh_token');
  localStorage.removeItem('auth_role');
  localStorage.removeItem('auth_email');
  window.location.assign('/auth/');
};

// Adiciona o token JWT nos headers se presente
api.interceptors.request.use(
  (config) => {
    if (typeof config.url === 'string') {
      const normalizedBase = (config.baseURL || '').replace(/\/+$/, '');
      const baseHasApiPrefix = normalizedBase.endsWith('/api') || normalizedBase === '/api';
      if (baseHasApiPrefix) {
        config.url = config.url.replace(/^\/api(?=\/|$)/, '');
      }
    }
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('auth_token') || localStorage.getItem('auth_access_token')
        : null;
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;
    const status = error?.response?.status;
    if (!originalRequest || status !== 401 || originalRequest._retry) {
      console.error("Erro na API:", error.response || error.message);
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRefreshResolvers.push({ resolve, reject });
      })
        .then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        })
        .catch((refreshError) => Promise.reject(refreshError));
    }

    isRefreshing = true;
    try {
      const refreshResponse = await refreshClient.post('/auth/refresh', {});
      const newAccessToken = refreshResponse?.data?.accessToken;
      const newRole = refreshResponse?.data?.user?.role;
      const newEmail = refreshResponse?.data?.user?.email;
      if (!newAccessToken) {
        throw new Error('Invalid refresh response');
      }
      localStorage.setItem('auth_token', newAccessToken);
      localStorage.setItem('auth_access_token', newAccessToken);
      if (newRole) {
        localStorage.setItem('auth_role', String(newRole).trim().toUpperCase());
      }
      if (newEmail) {
        localStorage.setItem('auth_email', newEmail);
      }
      pendingRefreshResolvers.forEach(({ resolve }) => resolve(newAccessToken));
      pendingRefreshResolvers = [];
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      pendingRefreshResolvers.forEach(({ reject }) => reject(refreshError));
      pendingRefreshResolvers = [];
      clearSessionAndRedirect();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
