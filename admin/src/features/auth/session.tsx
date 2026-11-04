import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError, type Session } from "@/lib/api";
import { queryClient } from "@/app/query-client";
import { RequestError, PageLoading } from "@/components/feedback/states";
import { Navigate, Outlet, useLocation } from "react-router-dom";
type State = {
  status: "loading" | "anonymous" | "authenticated" | "unavailable";
  user?: Session["user"];
};
const Context = createContext<{
  state: State;
  verify: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
} | null>(null);
async function readSession(): Promise<State> {
  try {
    const data = await api.session();
    return { status: "authenticated", user: data.user };
  } catch (error) {
    return {
      status:
        error instanceof ApiError && [401, 403].includes(error.status)
          ? "anonymous"
          : "unavailable",
    };
  }
}
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const epoch = useRef(0);
  async function verify() {
    const version = ++epoch.current;
    setState({ status: "loading" });
    const next = await readSession();
    if (version === epoch.current) setState(next);
  }
  useEffect(() => {
    let alive = true;
    const unsubscribe = api.subscribe(() => {
      epoch.current++;
      void queryClient.cancelQueries();
      queryClient.clear();
      setState({ status: "anonymous" });
    });
    const version = epoch.current;
    void readSession().then((next) => {
      if (alive && version === epoch.current) setState(next);
    });
    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel("buildestate.admin-new.session")
        : null;
    if (channel)
      channel.onmessage = () => {
        api.clear();
        void verify();
      };
    return () => {
      alive = false;
      unsubscribe();
      channel?.close();
    };
  }, []);
  function broadcast() {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel("buildestate.admin-new.session");
      channel.postMessage("changed");
      channel.close();
    }
  }
  async function login(email: string, password: string) {
    const data = await api.login(email, password);
    epoch.current++;
    setState({ status: "authenticated", user: data.user });
    broadcast();
  }
  async function logout() {
    await api.logout();
    broadcast();
  }
  return (
    <Context.Provider value={{ state, verify, login, logout }}>
      {children}
    </Context.Provider>
  );
}
// eslint-disable-next-line react-refresh/only-export-components
export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error("SessionProvider is required");
  return value;
}
export function ProtectedRoute() {
  const { state, verify } = useSession();
  const location = useLocation();
  if (state.status === "loading")
    return <PageLoading label="Checking your session" />;
  if (state.status === "unavailable")
    return (
      <main className="mx-auto flex min-h-svh max-w-lg items-center p-6">
        <RequestError
          message="Your session could not be verified. Retry when the server is available."
          retry={() => void verify()}
        />
      </main>
    );
  if (state.status !== "authenticated")
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
