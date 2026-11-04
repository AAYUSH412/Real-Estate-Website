import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { queryClient } from "./app/query-client";
import { router } from "./app/router";
import { SessionProvider } from "./features/auth/session";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "./app/theme";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./styles/globals.css";
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <SessionProvider>
          <RouterProvider router={router} />
          <Toaster richColors />
        </SessionProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>,
);
