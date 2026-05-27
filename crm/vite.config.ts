import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
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
