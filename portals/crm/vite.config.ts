import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import istanbul from 'vite-plugin-istanbul';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// `VITE_COVERAGE=true` (set by the Playwright webServer) instruments the app with
// istanbul so the E2E suite can collect `window.__coverage__`. Never enabled for
// production builds, so the shipped bundle is untouched.
const withCoverage = process.env.VITE_COVERAGE === 'true';

export default defineConfig({
  plugins: [
    react(),
    ...(withCoverage
      ? [
          istanbul({
            include: 'src/**/*.{ts,tsx}',
            exclude: ['node_modules', 'e2e', '__tests__', 'src/main.tsx'],
            extension: ['.ts', '.tsx'],
            requireEnv: false,
          }),
        ]
      : []),
  ],
  server: { port: 2007, host: true, strictPort: true },
  preview: { port: 2007, host: true, strictPort: true },
  resolve: {
    // `@/` maps to `src/` so __tests__ specs don't need long relative paths.
    alias: {
      '@': path.resolve(projectRoot, 'src'),
    },
    dedupe: [
      'react',
      'react-dom',
      'react-router',
      'react-router-dom',
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
      '@mui/system',
    ],
  },
});
