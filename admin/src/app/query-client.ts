import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      refetchOnWindowFocus: true,
      retry: (count, error) =>
        count < 1 &&
        (!(error instanceof ApiError) ||
          error.status >= 500 ||
          error.status === 0),
    },
    mutations: { retry: false },
  },
});
export const queryKeys = {
  session: ["session"] as const,
  list: (module: string, filters: object) => [module, "list", filters] as const,
  detail: (module: string, id: string) => [module, "detail", id] as const,
};
