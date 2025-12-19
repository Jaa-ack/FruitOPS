import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'http://localhost:4000',
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path.replace(/^\/api/, '/api')
          }
        },
      },
      plugins: [react()],
      // Do NOT inject server-only API keys into the client bundle.
      // The GEMINI API key is server-only and must be accessed from the server (e.g. /api/ai proxy).
      define: {
        // keep other VITE_ prefixed public envs here if needed
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom', 'react-router-dom'],
              'chart-vendor': ['recharts'],
              'ui-vendor': ['lucide-react'],
            }
          }
        },
        chunkSizeWarningLimit: 600
      }
    };
});
