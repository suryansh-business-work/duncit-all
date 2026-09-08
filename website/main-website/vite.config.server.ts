import { defineConfig } from 'vite';

/**
 * Builds the site's HTML server (server/main.ts) into dist-server/main.mjs — a
 * single self-contained Node bundle the Docker runner starts directly, so the
 * image ships no node_modules. `noExternal: true` inlines @duncit/brand's meta
 * builder and the site's own short-code pattern, which is what keeps ONE
 * definition of each shared between the built pages and the server serving
 * them. Node builtins stay external.
 */
export default defineConfig({
  build: {
    ssr: 'server/main.ts',
    outDir: 'dist-server',
    emptyOutDir: true,
    target: 'node20',
    minify: false,
    rollupOptions: {
      output: { entryFileNames: 'main.mjs' },
    },
  },
  ssr: {
    noExternal: true,
  },
});
