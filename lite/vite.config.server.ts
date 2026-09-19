import { defineConfig } from 'vite';

/**
 * Builds the Lite API + HTML server (server/index.ts) into dist-server/index.mjs.
 *
 * Workspace packages are bundled in — they ship TypeScript source, which Node
 * cannot run — while every npm dependency stays external and is installed in
 * the runner image, exactly as the main server's are.
 */
export default defineConfig({
  build: {
    ssr: 'server/index.ts',
    outDir: 'dist-server',
    emptyOutDir: true,
    target: 'node22',
    minify: false,
    sourcemap: true,
    rollupOptions: { output: { entryFileNames: 'index.mjs' } },
  },
  ssr: { noExternal: [/^@duncit\//] },
});
