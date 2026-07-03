import axios from 'axios';

// API Base URL - uses env variable or falls back to localhost
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api`
  : 'http://localhost:4000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // sends httpOnly user_refresh cookie on every request
});

// ── Request interceptor: attach auth token ──────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('buildestate_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Silent refresh on 401 ───────────────────────────────────
let _refreshPromise: Promise<unknown> | null = null;

const attemptRefresh = () => {
  if (!_refreshPromise) {
    _refreshPromise = axios
      .post(`${API_BASE_URL}/users/refresh`, {}, { withCredentials: true })
      .finally(() => { _refreshPromise = null; });
  }
  return _refreshPromise;
};

const clearSession = () => {
  localStorage.removeItem('buildestate_token');
  localStorage.removeItem('buildestate_user');
  if (window.location.pathname !== '/signin') window.location.href = '/signin';
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as typeof error.config & { _retried?: boolean };
    const url: string = original?.url ?? '';

    // Don't try to refresh on auth endpoints themselves
    const isAuthEndpoint = url.includes('/users/refresh') || url.includes('/users/login') || url.includes('/users/logout');

    if (error.response?.status === 401 && !original._retried && !isAuthEndpoint) {
      original._retried = true;
      try {
        const { data } = await attemptRefresh() as { data: { token: string; success: boolean } };
        if (data.success && data.token) {
          localStorage.setItem('buildestate_token', data.token);
          original.headers.Authorization = `Bearer ${data.token}`;
          return apiClient(original);
        }
      } catch {
        clearSession();
        return Promise.reject(error);
      }
    }

    if (error.response?.status === 401) {
      clearSession();
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

  login: (data: { email: string; password: string; rememberMe?: boolean }) =>
    apiClient.post('/users/login', data),

  forgotPassword: (email: string) =>
    apiClient.post('/users/forgot', { email }),

  resetPassword: (token: string, password: string) =>
    apiClient.post(`/users/reset/${token}`, { password }),

  verifyEmail: (token: string) =>
    apiClient.get(`/users/verify/${token}`),

  getProfile: () =>
    apiClient.get('/users/me'),

  updateProfile: (data: { name?: string; currentPassword?: string; newPassword?: string }) =>
    apiClient.put('/users/me', data),

  refresh: () => apiClient.post('/users/refresh', {}),
  logout: () => apiClient.post('/users/logout', {}),
};

// Properties (CRUD — admin-managed listings)
export const propertiesAPI = {
  getAll: () =>
    apiClient.get('/products/list'),

  getById: (id: string) =>
    apiClient.get(`/products/single/${id}`),
};

// User-submitted property listings (require auth)
export const userListingsAPI = {
  create: (formData: FormData) =>
    apiClient.post('/user/properties', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getMyListings: () =>
    apiClient.get('/user/properties'),

  update: (id: string, formData: FormData) =>
    apiClient.put(`/user/properties/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  delete: (id: string) =>
    apiClient.delete(`/user/properties/${id}`),
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

  // backend reads req.body.reason
  cancel: (id: string, reason?: string) =>
    apiClient.put(`/appointments/cancel/${id}`, { reason }),
};

// AI-Powered Property Search
// AI keys are server-side — users only supply their Firecrawl key.
export const aiAPI = {
  search: (data: {
    city?: string;
    locality?: string;
    bhk?: string;
    possession?: string;
    price?: { min: number; max: number };
    type?: string;
    category?: string;
  }) => {
    const firecrawlKey = localStorage.getItem('buildestate_firecrawl_key');
    return apiClient.post('/ai/search', data, {
      headers: {
        ...(firecrawlKey && { 'X-Firecrawl-Key': firecrawlKey }),
      },
    });
  },

  // SSE streaming search — phased: `properties` event fires after Firecrawl,
  // `analysis` event fires after AI. Returns an abort function to cancel mid-flight.
  searchStream: (
    data: {
      city?: string;
      locality?: string;
      bhk?: string;
      possession?: string;
      price?: { min: number; max: number };
      type?: string;
      category?: string;
    },
    callbacks: {
      onStatus:     (stage: string, message: string, count?: number) => void;
      onProperties: (data: Record<string, unknown>) => void;
      onAnalysis:   (data: Record<string, unknown>) => void;
      onResult:     (result: Record<string, unknown>) => void; // cache-hit full payload
      onError:      (error: { message: string; error?: string; status?: number }) => void;
      onDone?:      () => void;
    }
  ): (() => void) => {
    const controller   = new AbortController();
    const firecrawlKey = localStorage.getItem('buildestate_firecrawl_key');
    const token        = localStorage.getItem('buildestate_token');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept':       'text/event-stream',
    };
    if (firecrawlKey) headers['X-Firecrawl-Key'] = firecrawlKey;
    if (token)        headers['Authorization']    = `Bearer ${token}`;

    fetch(`${API_BASE_URL}/ai/search`, {
      method: 'POST',
      headers,
      body:   JSON.stringify(data),
      signal: controller.signal,
    })
      .then(async (response) => {
        // Non-SSE error responses (rate limit, missing keys, etc. from middleware)
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          callbacks.onError({
            message: body.message || 'Search failed',
            error:   body.error,
            status:  response.status,
          });
          return;
        }

        // Parse SSE stream using the standard event-field + data-field + blank-line protocol
        const reader  = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer      = '';
        let eventType   = 'message';
        let dataBuffer  = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? ''; // keep incomplete last line for next chunk

          for (const line of lines) {
            if (line === '') {
              // Blank line = end of event, dispatch it
              if (dataBuffer) {
                try {
                  const parsed = JSON.parse(dataBuffer);
                  if      (eventType === 'status')     callbacks.onStatus(parsed.stage, parsed.message ?? '', parsed.count);
                  else if (eventType === 'properties') callbacks.onProperties(parsed);
                  else if (eventType === 'analysis')   callbacks.onAnalysis(parsed);
                  else if (eventType === 'result')     callbacks.onResult(parsed);
                  else if (eventType === 'error')      callbacks.onError(parsed);
                  else if (eventType === 'done')       callbacks.onDone?.();
                } catch (_) { /* malformed data — skip */ }
              }
              eventType  = 'message';
              dataBuffer = '';
            } else if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              dataBuffer = line.slice(6);
            }
          }
        }
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') {
          callbacks.onError({ message: err.message || 'Network error' });
        }
      });

    return () => controller.abort();
  },

  localities: (city: string, q?: string) =>
    apiClient.get('/ai/localities', { params: { city, ...(q && { q }) } }),

  locationTrends: (city: string) => {
    const firecrawlKey = localStorage.getItem('buildestate_firecrawl_key');
    return apiClient.get(`/locations/${encodeURIComponent(city)}/trends`, {
      headers: {
        ...(firecrawlKey && { 'X-Firecrawl-Key': firecrawlKey }),
      },
    });
  },

  validateKeys: (keys?: { firecrawlKey?: string }) => {
    const firecrawlKey = (keys?.firecrawlKey ?? localStorage.getItem('buildestate_firecrawl_key') ?? '').trim();
    return apiClient.post('/ai/validate-keys', {}, {
      headers: {
        ...(firecrawlKey && { 'X-Firecrawl-Key': firecrawlKey }),
      },
    });
  },
};

// Firecrawl key storage — AI keys are server-side, users only manage Firecrawl.
export const apiKeyStorage = {
  getFirecrawlKey: ()            => localStorage.getItem('buildestate_firecrawl_key') || '',
  setFirecrawlKey: (key: string) => localStorage.setItem('buildestate_firecrawl_key', key),
  hasKeys:         ()            => !!localStorage.getItem('buildestate_firecrawl_key'),
  clear:           ()            => localStorage.removeItem('buildestate_firecrawl_key'),
};

// Contact Form
export const contactAPI = {
  submit: (data: { name: string; email: string; phone: string; message: string }) =>
    apiClient.post('/forms/submit', data),
};

export default apiClient;

