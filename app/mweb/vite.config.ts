import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json' with { type: 'json' };

// Split large, stable vendor libraries into their own chunks so they cache
// across deploys (app code changes far more often) and download in parallel,
// instead of inflating the main entry chunk. Pairs with route-level lazy
// loading in AppRoutes.
function vendorChunk(id: string): string | undefined {
  if (!id.includes('node_modules')) return undefined;
  if (id.includes('@mui') || id.includes('@emotion')) return 'mui';
  if (id.includes('@apollo') || id.includes('/graphql/')) return 'apollo';
  if (id.includes('react-quill') || id.includes('quill')) return 'quill';
  if (id.includes('react-slick') || id.includes('slick-carousel')) return 'slick';
  if (id.includes('lottie')) return 'lottie';
  if (id.includes('@fortawesome')) return 'fontawesome';
  return undefined;
}

export default defineConfig({
  plugins: [react()],
  // Surface the package version to the app (shown in the profile drawer footer).
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: { port: 2003, host: true, strictPort: true },
  preview: { port: 2003, host: true, strictPort: true },
  build: {
    rollupOptions: {
      output: { manualChunks: (id) => vendorChunk(id) },
    },
  },
  resolve: {
    // Workspace packages (e.g. @duncit/user-context) are served as source via
    // /@fs and carry their own node_modules/react under pnpm. Pin React (and
    // Apollo) to this app's copy so a second instance can never break hooks
    // ("Invalid hook call" → useState of null inside UserProvider).
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
    dedupe: [
      'react',
      'react-dom',
      'react-router',
      'react-router-dom',
      '@apollo/client',
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
      '@mui/system',
      '@mui/x-date-pickers',
    ],
  },
  optimizeDeps: {
    // Pre-bundle EVERY shared React-context singleton in the first optimize
    // pass. This app serves workspace packages (e.g. @duncit/user-context) as
    // source via /@fs and lazy-loads routes — Vite's dep scanner crawls neither
    // deeply, so a dep imported only through those boundaries gets discovered
    // late and re-optimized on its own, minting a fresh `?v=` hash. When the
    // already-running page holds the old hash and a new chunk pulls the new one,
    // React/Router load twice → "Cannot read properties of null (reading
    // 'useContext')". Listing them here forces one complete optimize generation
    // up front so nothing forks mid-session. If a new context-providing dep is
    // added, add it here too (then restart dev with `--force`).
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-router',
      'react-router-dom',
      '@apollo/client',
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
      '@mui/material/styles',
      '@mui/icons-material',
      '@mui/x-date-pickers',
      '@mui/x-date-pickers/LocalizationProvider',
      '@mui/x-date-pickers/AdapterDateFns',
      '@mui/x-date-pickers/DateTimePicker',
      '@mui/x-date-pickers/DatePicker',
      '@mui/x-date-pickers/TimePicker',
      'react-hook-form',
      '@hookform/resolvers/zod',
      'zod',
      'date-fns',
      'react-slick',
      '@react-oauth/google',
    ],
  },
});
