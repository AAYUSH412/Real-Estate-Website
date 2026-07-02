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

  verifyEmail: (token: string) =>
    apiClient.get(`/users/verify/${token}`),

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

  cancel: (id: string, reason?: string) =>
    apiClient.put(`/appointments/cancel/${id}`, { cancelReason: reason }),
};

// AI-Powered Property Search
// Backend transforms the request via middleware at POST /api/ai/search
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
    const githubKey    = localStorage.getItem('buildestate_github_key');
    const firecrawlKey = localStorage.getItem('buildestate_firecrawl_key');
    const nvidiaKey    = localStorage.getItem('buildestate_nvidia_key');
    return apiClient.post('/ai/search', data, {
      headers: {
        ...(githubKey    && { 'X-Github-Key':    githubKey }),
        ...(firecrawlKey && { 'X-Firecrawl-Key': firecrawlKey }),
        ...(nvidiaKey    && { 'X-Nvidia-Key':    nvidiaKey  }),
      },
    });
  },

  // SSE streaming search — sends Accept: text/event-stream, receives progress events
  // then a final `result` event. Returns an abort function to cancel mid-flight.
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
      onStatus: (stage: string, message: string, count?: number) => void;
      onResult: (result: Record<string, unknown>) => void;
      onError:  (error: { message: string; error?: string; status?: number }) => void;
      onDone?:  () => void;
    }
  ): (() => void) => {
    const controller = new AbortController();

    const githubKey    = localStorage.getItem('buildestate_github_key');
    const firecrawlKey = localStorage.getItem('buildestate_firecrawl_key');
    const nvidiaKey    = localStorage.getItem('buildestate_nvidia_key');
    const token        = localStorage.getItem('buildestate_token');

    const headers: Record<string, string> = {
      'Content-Type':  'application/json',
      'Accept':        'text/event-stream',
    };
    if (githubKey)    headers['X-Github-Key']    = githubKey;
    if (firecrawlKey) headers['X-Firecrawl-Key'] = firecrawlKey;
    if (nvidiaKey)    headers['X-Nvidia-Key']    = nvidiaKey;
    if (token)        headers['Authorization']   = `Bearer ${token}`;

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
                  if      (eventType === 'status') callbacks.onStatus(parsed.stage, parsed.message ?? '', parsed.count);
                  else if (eventType === 'result') callbacks.onResult(parsed);
                  else if (eventType === 'error')  callbacks.onError(parsed);
                  else if (eventType === 'done')   callbacks.onDone?.();
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
    const githubKey    = localStorage.getItem('buildestate_github_key');
    const firecrawlKey = localStorage.getItem('buildestate_firecrawl_key');
    const nvidiaKey    = localStorage.getItem('buildestate_nvidia_key');
    return apiClient.get(`/locations/${encodeURIComponent(city)}/trends`, {
      headers: {
        ...(githubKey    && { 'X-Github-Key':    githubKey }),
        ...(firecrawlKey && { 'X-Firecrawl-Key': firecrawlKey }),
        ...(nvidiaKey    && { 'X-Nvidia-Key':    nvidiaKey  }),
      },
    });
  },

  validateKeys: (keys?: { githubKey?: string; firecrawlKey?: string; nvidiaKey?: string }) => {
    const githubKey    = (keys?.githubKey    ?? localStorage.getItem('buildestate_github_key')    ?? '').trim();
    const firecrawlKey = (keys?.firecrawlKey ?? localStorage.getItem('buildestate_firecrawl_key') ?? '').trim();
    const nvidiaKey    = (keys?.nvidiaKey    ?? localStorage.getItem('buildestate_nvidia_key')    ?? '').trim();

    return apiClient.post('/ai/validate-keys', {}, {
      headers: {
        ...(githubKey    && { 'X-Github-Key':    githubKey    }),
        ...(firecrawlKey && { 'X-Firecrawl-Key': firecrawlKey }),
        ...(nvidiaKey    && { 'X-Nvidia-Key':    nvidiaKey    }),
      },
    });
  },
};

// Helpers to read/write user API keys in localStorage
export const apiKeyStorage = {
  getGithubKey:    ()          => localStorage.getItem('buildestate_github_key')    || '',
  getFirecrawlKey: ()          => localStorage.getItem('buildestate_firecrawl_key') || '',
  getNvidiaKey:    ()          => localStorage.getItem('buildestate_nvidia_key')     || '',
  setGithubKey:    (key: string) => localStorage.setItem('buildestate_github_key',    key),
  setFirecrawlKey: (key: string) => localStorage.setItem('buildestate_firecrawl_key', key),
  setNvidiaKey:    (key: string) => localStorage.setItem('buildestate_nvidia_key',     key),
  // When VITE_SERVER_AI_ENABLED=true the backend supplies the NVIDIA key —
  // users only need Firecrawl. Otherwise require Firecrawl + one AI key.
  hasKeys: () => {
    const hasFirecrawl  = !!localStorage.getItem('buildestate_firecrawl_key');
    const serverHasAI   = import.meta.env.VITE_SERVER_AI_ENABLED === 'true';
    if (serverHasAI) return hasFirecrawl;
    const hasAI = !!(localStorage.getItem('buildestate_github_key') || localStorage.getItem('buildestate_nvidia_key'));
    return hasFirecrawl && hasAI;
  },
  // Optional — true when NVIDIA NIM key is also set
  hasNvidiaKey: () => !!localStorage.getItem('buildestate_nvidia_key'),
  clear: () => {
    localStorage.removeItem('buildestate_github_key');
    localStorage.removeItem('buildestate_firecrawl_key');
    localStorage.removeItem('buildestate_nvidia_key');
  },
};

// Contact Form
export const contactAPI = {
  submit: (data: { name: string; email: string; phone: string; message: string }) =>
    apiClient.post('/forms/submit', data),
};

export default apiClient;

