import axios from 'axios';

// API Base URL - uses env variable or falls back to localhost
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : 'http://localhost:4000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor: attach auth token ──────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('buildestate_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: auto-logout on 401 ────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('buildestate_token');
      // Optionally redirect to login
      // window.location.href = '/signin';
    }
    return Promise.reject(error);
  }
);

// ═══════════════════════════════════════════════════════════
// API Endpoints — aligned with backend routes
// ═══════════════════════════════════════════════════════════

// User Authentication
// Backend register expects { name, email, password }
// We transform fullName → name here so the UI can keep using fullName
export const userAPI = {
  register: (data: { fullName: string; email: string; phone: string; password: string }) =>
    apiClient.post('/users/register', {
      name: data.fullName,
      email: data.email,
      password: data.password,
    }),

  login: (data: { email: string; password: string }) =>
    apiClient.post('/users/login', data),

  forgotPassword: (email: string) =>
    apiClient.post('/users/forgot', { email }),

  resetPassword: (token: string, password: string) =>
    apiClient.post(`/users/reset/${token}`, { password }),

  getProfile: () =>
    apiClient.get('/users/me'),
};

// Properties (CRUD — admin-managed listings)
export const propertiesAPI = {
  getAll: () =>
    apiClient.get('/products/list'),

  getById: (id: string) =>
    apiClient.get(`/products/single/${id}`),
};

// Appointments (supports guest + auth bookings)
export const appointmentsAPI = {
  schedule: (data: {
    propertyId: string;
    date: string;
    time: string;
    name: string;
    email: string;
    phone: string;
    message?: string;
  }) =>
    apiClient.post('/appointments/schedule', data),

  getByUser: () =>
    apiClient.get('/appointments/user'),

  cancel: (id: string, reason?: string) =>
    apiClient.put(`/appointments/cancel/${id}`, { cancelReason: reason }),
};

// AI-Powered Property Search
// Backend transforms the request via middleware at POST /api/ai/search
export const aiAPI = {
  search: (data: {
    city?: string;
    price?: { min: number; max: number };
    type?: string;
    category?: string;
  }) => {
    const githubKey    = localStorage.getItem('buildestate_github_key');
    const firecrawlKey = localStorage.getItem('buildestate_firecrawl_key');
    return apiClient.post('/ai/search', data, {
      headers: {
        ...(githubKey    && { 'X-Github-Key':    githubKey }),
        ...(firecrawlKey && { 'X-Firecrawl-Key': firecrawlKey }),
      },
    });
  },

  locationTrends: (city: string) => {
    const githubKey    = localStorage.getItem('buildestate_github_key');
    const firecrawlKey = localStorage.getItem('buildestate_firecrawl_key');
    return apiClient.get(`/locations/${encodeURIComponent(city)}/trends`, {
      headers: {
        ...(githubKey    && { 'X-Github-Key':    githubKey }),
        ...(firecrawlKey && { 'X-Firecrawl-Key': firecrawlKey }),
      },
    });
  },
};

// Helpers to read/write user API keys in localStorage
export const apiKeyStorage = {
  getGithubKey:    ()    => localStorage.getItem('buildestate_github_key') || '',
  getFirecrawlKey: ()    => localStorage.getItem('buildestate_firecrawl_key') || '',
  setGithubKey:    (key: string) => localStorage.setItem('buildestate_github_key', key),
  setFirecrawlKey: (key: string) => localStorage.setItem('buildestate_firecrawl_key', key),
  hasKeys: () => !!(localStorage.getItem('buildestate_github_key') && localStorage.getItem('buildestate_firecrawl_key')),
  clear: () => {
    localStorage.removeItem('buildestate_github_key');
    localStorage.removeItem('buildestate_firecrawl_key');
  },
};

// Contact Form
export const contactAPI = {
  submit: (data: { name: string; email: string; phone: string; message: string }) =>
    apiClient.post('/forms/submit', data),
};

export default apiClient;

