import { defineConfig, loadEnv, type Plugin } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// Fix for __dirname in ESM
const __dirname = path.resolve();

// Startup banner — matches the backend's terminal art
const banner = (mode: string, env: Record<string, string>): Plugin => ({
  name: 'buildestate-banner',
  apply: 'serve',
  configureServer(server) {
    server.httpServer?.once('listening', () => {
      // small delay so it prints after Vite's own "ready" output
      setTimeout(() => {
        const local = server.resolvedUrls?.local[0] ?? 'http://localhost:5173';
        const started = new Date().toLocaleTimeString('en-GB', { hour12: false });
        console.log([
          '',
          '╔══════════════════════════════════════════════╗',
          '║         BuildEstate Frontend  v1.0.0         ║',
          '╚══════════════════════════════════════════════╝',
          '',
          `  ◆ Environment       ${mode}`,
          `  ◆ Local             ${local}`,
          `  ◆ Backend API       ${env.VITE_API_BASE_URL || 'http://localhost:4000'}`,
          `  ◆ AI Hub            ${env.VITE_ENABLE_AI_HUB === 'true' ? '✓ enabled' : '✗ disabled'}`,
          `  ◆ Started           ${started}`,
          '──────────────────────────────────────────────',
          '',
        ].join('\n'));
      }, 150);
    });
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      banner(mode, env),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/')) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/framer-motion/')) {
              return 'vendor-motion';
            }
            if (id.includes('node_modules/lucide-react/') || id.includes('node_modules/@radix-ui/')) {
              return 'vendor-ui';
            }
            if (id.includes('/components/ai-hub/') || id.includes('/pages/AIPropertyHubPage')) {
              return 'chunk-ai-hub';
            }
          },
        },
      },
    },
    assetsInclude: ['**/*.svg', '**/*.csv'],
  };
})
