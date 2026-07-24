import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Don't reload the dev page when the coverage report is (re)generated — the
  // `coverage/` HTML is a build artifact, not a source file.
  server: { port: 2016, host: true, strictPort: true, watch: { ignored: ['**/coverage/**'] } },
  preview: { port: 2016, host: true, strictPort: true },
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
