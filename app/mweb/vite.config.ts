import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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
    ],
  },
  optimizeDeps: {
    // Pre-bundle the shared runtime deps so a linked-workspace edit (e.g.
    // @duncit/user-context) re-optimizes consistently and lazy route chunks
    // never end up holding a stale/null React reference ("useContext of null").
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@apollo/client',
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
      '@mui/material/styles',
    ],
  },
});
