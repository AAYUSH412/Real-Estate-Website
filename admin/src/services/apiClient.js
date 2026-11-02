import { createQueryCache } from '@buildestate/contracts';
import axios from 'axios';
import { APP_CONSTANTS, backendurl } from '../config/constants';

export const queryCache = createQueryCache();

const apiClient = axios.create({
  baseURL: backendurl,
  withCredentials: true, // send the httpOnly admin_refresh cookie
});

apiClient.interceptors.request.use(
  async (config) => {
    if (config.method && config.method !== 'get') queryCache.clear();
    let token = localStorage.getItem(APP_CONSTANTS.TOKEN_KEY);
    if (token && !config.url?.includes('/api/users/admin')) {
      let expired = true;
      try { const { exp } = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); expired = !Number.isFinite(exp) || exp * 1000 <= Date.now() + 15000; } catch { /* Invalid stored token requires a new session. */ }
      if (expired) {
        try {
          const { data } = await refreshAccessToken();
          if (!data.success || !data.token) throw new Error('Session refresh failed');
          token = data.token; localStorage.setItem(APP_CONSTANTS.TOKEN_KEY, token);
        } catch (error) {
          if ([401, 403].includes(error.response?.status)) clearSession();
          throw error;
        }
      }
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const clearSession = () => {
  queryCache.clear();
  localStorage.removeItem(APP_CONSTANTS.TOKEN_KEY);
  localStorage.removeItem(APP_CONSTANTS.IS_ADMIN_KEY);
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

// Deduplicate concurrent refresh attempts so parallel 401s share one call
let refreshPromise = null;

const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${backendurl}/api/users/admin/refresh`, {}, { withCredentials: true })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthEndpoint = original?.url?.includes('/api/users/admin');

    if (error.response?.status === 401 && original && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      try {
        const { data } = await refreshAccessToken();
        if (data.success && data.token) {
          localStorage.setItem(APP_CONSTANTS.TOKEN_KEY, data.token);
          original.headers.Authorization = `Bearer ${data.token}`;
          return apiClient(original);
        }
      } catch {
        // refresh cookie missing/expired — fall through to logout
      }
      clearSession();
    } else if (error.response?.status === 401 && !isAuthEndpoint) {
      clearSession();
    }

    return Promise.reject(error);
  }
);

export const queryGet = (url, params = {}, signal) => {
  const key = JSON.stringify([localStorage.getItem(APP_CONSTANTS.TOKEN_KEY), url, params]);
  return queryCache.get(key, () => apiClient.get(url, { params }), signal);
};
window.addEventListener('storage', () => queryCache.clear());
export default apiClient;
