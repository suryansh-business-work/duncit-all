import { defineConfig } from 'vite';

/**
 * Builds the HTML/meta server (server/main.ts) into dist-server/main.mjs —
 * a single self-contained Node bundle the Docker runner starts directly, so
 * the image ships no node_modules. `noExternal: true` inlines @duncit/i18n
 * (the mweb.meta.* fallback copy) into the bundle; node builtins stay external.
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
