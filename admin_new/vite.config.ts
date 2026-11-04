import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: {
      proxy: {
        "/api": {
          target: env.DEV_API_TARGET || "http://localhost:4000",
          changeOrigin: false,
          configure: (proxy) => {
            proxy.on("proxyReq", (request) => request.removeHeader("origin"));
          },
        },
      },
    },
    test: {
      environment: "jsdom",
      include: ["tests/**/*.test.{ts,tsx}"],
      restoreMocks: true,
    },
  };
});
