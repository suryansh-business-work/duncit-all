import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// Every page is rendered per request: the content lives in the CMS, and a
// publish in the Website portal must reach the site without a rebuild. The
// server's Redis response cache absorbs the repeat reads.
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  server: {
    port: 2043,
    host: true,
  },
  // Pages are addressed by whatever the CMS says; no trailing-slash variants.
  trailingSlash: 'never',
  vite: {
    // The @duncit/* workspace packages ship TypeScript source, not built JS.
    // A static site never notices (everything is bundled at build time); a
    // server render would hand them to Node's own loader, which cannot read
    // them — so they are bundled into the server build too.
    ssr: { noExternal: [/^@duncit\//] },
  },
});
