import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Startup banner — matches the backend's terminal art
const banner = (mode, env) => ({
  name: 'buildestate-banner',
  apply: 'serve',
  configureServer(server) {
    server.httpServer?.once('listening', () => {
      // small delay so it prints after Vite's own "ready" output
      setTimeout(() => {
        const local = server.resolvedUrls?.local[0] ?? 'http://localhost:5174';
        const started = new Date().toLocaleTimeString('en-GB', { hour12: false });
        console.log([
          '',
          '╔══════════════════════════════════════════════╗',
          '║          BuildEstate Admin  v1.0.0           ║',
          '╚══════════════════════════════════════════════╝',
          '',
          `  ◆ Environment       ${mode}`,
          `  ◆ Local             ${local}`,
          `  ◆ Backend API       ${env.VITE_BACKEND_URL || 'http://localhost:4000'}`,
          `  ◆ Started           ${started}`,
          '──────────────────────────────────────────────',
          '',
        ].join('\n'));
      }, 150);
    });
  },
});

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), banner(mode, env)],
    server: {
      port: 5174,
      proxy: {
        '/api': {
          target: 'http://localhost:4000',
          changeOrigin: true,
          secure: false,
        }
      }
    }
  };
})
