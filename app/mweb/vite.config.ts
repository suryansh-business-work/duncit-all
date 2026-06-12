import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 2003, host: true, strictPort: true },
  preview: { port: 2003, host: true, strictPort: true },
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
    ],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
      '@mui/material/styles',
    ],
  },
});
