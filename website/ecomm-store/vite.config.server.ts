import { defineConfig } from 'vite';

/**
 * Builds the store's HTML server (server/main.ts) into dist-server/main.mjs — a
 * single self-contained Node bundle the Docker runner starts directly, so the
 * image ships no node_modules. It serves the built SPA and writes each product,
 * category and collection page's own title, description, social card and
 * JSON-LD into the head before the HTML leaves, which is what a search engine
 * and a link unfurler read. Node builtins stay external.
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
