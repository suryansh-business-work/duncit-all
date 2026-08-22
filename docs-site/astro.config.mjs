import { fileURLToPath } from 'node:url';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import { defineConfig } from 'astro/config';
import { SHIKI_THEMES } from './src/shiki-themes.mjs';

// The package MDX lives outside this workspace (packages/*/docs), so a relative
// import of a docs-site component would be a `../../../docs-site/src/…` chain
// that breaks the moment a file moves. One alias instead.
const docsSrc = fileURLToPath(new URL('./src', import.meta.url));

// The Preview examples live in @duncit/docs-demos, next to the demo modules the
// Tech portal renders, so an example exists once rather than once per reader.
// This alias exists for ONE reason: a page imports each example twice — the
// component, and its own source with `?raw` — and the query does not survive a
// package exports-map lookup, so Rollup cannot resolve
// `@duncit/docs-demos/examples/X.tsx?raw`. Aliasing the subpath to the file
// keeps the specifier in the docs honest while letting the query through.
const demoExamples = fileURLToPath(
  new URL('../packages/docs-demos/src/examples', import.meta.url)
);

// Port 2500 keeps this clear of every app in scripts/kill-ports.mjs.
export default defineConfig({
  server: { port: 2500, host: true },
  // React powers the live previews: a package's MDX imports the REAL export
  // from @duncit/ui / @duncit/dialogs and mounts it as an island.
  integrations: [react(), mdx()],
  // Highlight every fenced block in BOTH palettes at build time. Astro writes
  // the light colours inline and the dark ones as `--shiki-dark*` custom
  // properties, which is what lets styles/code.css switch themes with one rule
  // instead of re-rendering. Without this the default is github-dark alone —
  // black boxes on a white page, which is how the site read before.
  markdown: { shikiConfig: { themes: SHIKI_THEMES, wrap: false } },
  vite: {
    // The MDX lives in packages/*/docs, outside this workspace, so Vite has to
    // be allowed to serve from the repo root in dev.
    server: { fs: { allow: ['..'] } },
    // Longest prefix first: '@duncit/docs-demos/examples' must win before any
    // broader entry could claim it.
    resolve: { alias: { '@duncit/docs-demos/examples': demoExamples, '@docs': docsSrc } },
    // Astro pre-renders every island in Node. Left external, `@mui/icons-material/X`
    // resolves to its CJS build and the default import arrives as `{ default: … }`,
    // which React rejects with "Element type is invalid". Bundling the MUI/emotion
    // family through Vite keeps it ESM — and keeps it to ONE emotion instance.
    ssr: {
      noExternal: ['@mui/material', '@mui/icons-material', '@mui/system', '@emotion/react', '@emotion/styled'],
    },
  },
});
