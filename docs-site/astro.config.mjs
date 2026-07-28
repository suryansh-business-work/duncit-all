import { fileURLToPath } from 'node:url';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import { defineConfig } from 'astro/config';

// The package MDX lives outside this workspace (packages/*/docs), so a relative
// import of a docs-site component would be a `../../../docs-site/src/…` chain
// that breaks the moment a file moves. One alias instead.
const docsSrc = fileURLToPath(new URL('./src', import.meta.url));

// Port 2500 keeps this clear of every app in scripts/kill-ports.mjs.
export default defineConfig({
  server: { port: 2500, host: true },
  // React powers the live previews: a package's MDX imports the REAL export
  // from @duncit/ui / @duncit/dialogs and mounts it as an island.
  integrations: [react(), mdx()],
  vite: {
    // The MDX lives in packages/*/docs, outside this workspace, so Vite has to
    // be allowed to serve from the repo root in dev.
    server: { fs: { allow: ['..'] } },
    resolve: { alias: { '@docs': docsSrc } },
    // Astro pre-renders every island in Node. Left external, `@mui/icons-material/X`
    // resolves to its CJS build and the default import arrives as `{ default: … }`,
    // which React rejects with "Element type is invalid". Bundling the MUI/emotion
    // family through Vite keeps it ESM — and keeps it to ONE emotion instance.
    ssr: {
      noExternal: ['@mui/material', '@mui/icons-material', '@mui/system', '@emotion/react', '@emotion/styled'],
    },
  },
});
