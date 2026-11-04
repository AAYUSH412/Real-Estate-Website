export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}
type Options = RequestInit & { anonymous?: boolean; responseType?: "blob" };
type Identity = { id: string; email: string; role: string };
export type Session = { success: true; user: Identity };
const configured = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";
if (configured && !/^https?:\/\//.test(configured))
  throw new Error("VITE_API_URL must be an absolute HTTP(S) origin.");

// Tokens remain in memory. The httpOnly refresh cookie restores a validated session.
export function createApi(
  base = configured,
  transport: typeof fetch = (...args) => fetch(...args),
) {
  let token: string | null = null;
  let generation = 0;
  let pending: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  function clear() {
    generation++;
    token = null;
    for (const listener of listeners) listener();
  }
  async function raw<T>(path: string, options: Options = {}): Promise<T> {
    const headers = new Headers(options.headers);
    if (options.body && !(options.body instanceof FormData))
      headers.set("Content-Type", "application/json");
    let response: Response;
    try {
      response = await transport(`${base}${path}`, {
        ...options,
        headers,
        credentials: "include",
        signal: options.signal ?? AbortSignal.timeout(20000),
      });
    } catch (error) {
      if (options.signal?.aborted) throw error;
      throw new ApiError(
        0,
        "Cannot reach the server. Check your connection and retry.",
      );
    }
    if (response.ok && options.responseType === "blob")
      return { blob: await response.blob(), headers: response.headers } as T;
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false)
      throw new ApiError(
        response.status,
        data.message || "The request could not be completed.",
        data.code,
        data.fields,
      );
    return data as T;
  }
  function refresh() {
    if (!pending) {
      const version = generation;
      const exchange = () =>
        raw<{ token: string }>("/api/users/admin/refresh", { method: "POST" });
      // Cookies are shared between tabs; serialize rotation when Web Locks is available.
      const exchangePromise =
        typeof navigator !== "undefined" && navigator.locks
          ? navigator.locks.request("buildestate.admin-new.refresh", exchange)
          : exchange();
      pending = exchangePromise
        .then(async (data) => {
          const refreshed = await data;
          if (version !== generation)
            throw new ApiError(401, "Your session changed. Sign in again.");
          if (!refreshed.token)
            throw new ApiError(401, "Your session expired. Sign in again.");
          token = refreshed.token;
        })
        .catch((error) => {
          if (
            version === generation &&
            error instanceof ApiError &&
            [401, 403].includes(error.status)
          )
            clear();
          throw error;
        })
        .finally(() => {
          pending = null;
        });
    }
    return pending;
  }
  async function request<T>(path: string, options: Options = {}): Promise<T> {
    const version = generation;
    if (!options.anonymous && !token) await refresh();
    const send = () =>
      raw<T>(path, {
        ...options,
        headers: {
          ...Object.fromEntries(new Headers(options.headers)),
          ...(token && !options.anonymous
            ? { Authorization: `Bearer ${token}` }
            : {}),
        },
      });
    try {
      const result = await send();
      if (!options.anonymous && version !== generation)
        throw new ApiError(401, "Your session changed.");
      return result;
    } catch (error) {
      if (options.anonymous || !(error instanceof ApiError)) throw error;
      if (error.status === 401 && version === generation) {
        await refresh();
        try {
          const result = await send();
          if (version !== generation)
            throw new ApiError(401, "Your session changed.");
          return result;
        } catch (retryError) {
          if (
            retryError instanceof ApiError &&
            [401, 403].includes(retryError.status)
          )
            clear();
          throw retryError;
        }
      }
      if (error.status === 403 && version === generation) clear();
      throw error;
    }
  }
  return {
    request,
    clear,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async login(email: string, password: string) {
      clear();
      const version = generation;
      const data = await raw<{ token: string }>("/api/users/admin", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (version !== generation)
        throw new ApiError(401, "Your session changed.");
      token = data.token;
      return request<Session>("/api/admin/session");
    },
    session: () => request<Session>("/api/admin/session"),
    async logout() {
      await raw("/api/users/admin/logout", { method: "POST" });
      clear();
    },
  };
}
export const api = createApi();
