import axios from 'axios';
import { APP_CONSTANTS, backendurl } from '../config/constants';

const apiClient = axios.create({
  baseURL: backendurl,
  withCredentials: true, // send the httpOnly admin_refresh cookie
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(APP_CONSTANTS.TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const clearSession = () => {
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

export default apiClient;
