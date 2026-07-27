import mdx from '@astrojs/mdx';
import { defineConfig } from 'astro/config';

// Port 2500 keeps this clear of every app in scripts/kill-ports.mjs.
export default defineConfig({
  server: { port: 2500, host: true },
  integrations: [mdx()],
  // The MDX lives in packages/*/docs, outside this workspace, so Vite has to be
  // allowed to serve from the repo root in dev.
  vite: { server: { fs: { allow: ['..'] } } },
});
