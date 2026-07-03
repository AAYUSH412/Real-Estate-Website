import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// Fix for __dirname in ESM
const __dirname = path.resolve();

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
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
})
