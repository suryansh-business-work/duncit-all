import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const ASSET_PREFIXES = ['/@', '/node_modules', '/web/', '/portal/', '/shared/', '/public/'];
const HAS_EXTENSION = /\.[a-z0-9]+(\?.*)?$/i;

/**
 * In production the Node server picks the page by Host (luma-portal.* gets the
 * console). `vite dev` does the same for any host that starts with `portal.`,
 * so http://portal.localhost:2041 is the console and http://localhost:2041 the app.
 */
function hostSwitch(): Plugin {
  return {
    name: 'duncit-lite-host-switch',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const host = String(req.headers.host ?? '');
        const path = req.url ?? '/';
        const isAsset = ASSET_PREFIXES.some((prefix) => path.startsWith(prefix)) || HAS_EXTENSION.test(path);
        if (!isAsset) req.url = host.startsWith('portal.') ? '/portal.html' : '/index.html';
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), hostSwitch()],
  appType: 'mpa',
  server: {
    port: 2041,
    host: true,
    strictPort: true,
    proxy: {
      '/graphql': 'http://localhost:2040',
      '/upload': 'http://localhost:2040',
      '/ics': 'http://localhost:2040',
      '/health': 'http://localhost:2040',
    },
  },
  preview: { port: 2041, host: true, strictPort: true },
  build: {
    rollupOptions: {
      input: { web: resolve(__dirname, 'index.html'), portal: resolve(__dirname, 'portal.html') },
    },
  },
  resolve: {
    dedupe: [
      'react',
      'react-dom',
      'react-router',
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
      '@mui/system',
      '@apollo/client',
    ],
  },
});
