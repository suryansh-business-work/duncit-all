import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Builds the web app's server render (web/entry-server.tsx) into
 * dist-server/ssr/entry-server.mjs, beside the API bundle the image already
 * ships. Runs AFTER vite.config.server.ts (which empties dist-server).
 *
 * Everything is bundled in (`noExternal: true`): the runner image installs
 * only Lite's runtime `dependencies`, and React, MUI and Apollo are build-time
 * dependencies here. Node built-ins stay external on their own.
 */
export default defineConfig({
  plugins: [react()],
  // The page shell and public files ship with the client build; this bundle is code only.
  publicDir: false,
  build: {
    ssr: 'web/entry-server.tsx',
    outDir: 'dist-server/ssr',
    emptyOutDir: false,
    target: 'node22',
    minify: false,
    sourcemap: true,
    rollupOptions: { output: { entryFileNames: 'entry-server.mjs', inlineDynamicImports: true } },
  },
  ssr: { noExternal: true, target: 'node' },
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router', '@emotion/react', '@emotion/styled', '@mui/material', '@mui/system', '@apollo/client'],
  },
});
