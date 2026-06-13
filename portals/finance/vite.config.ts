import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import istanbul from 'vite-plugin-istanbul';

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
            exclude: ['node_modules', 'e2e', 'src/main.tsx'],
            extension: ['.ts', '.tsx'],
            requireEnv: false,
          }),
        ]
      : []),
  ],
  server: { port: 2008, host: true, strictPort: true },
  preview: { port: 2008, host: true, strictPort: true },
  resolve: {
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
