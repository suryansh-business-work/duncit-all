import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json' with { type: 'json' };

// Split large, stable vendor libraries into their own chunks so they cache
// across deploys (app code changes far more often) and download in parallel,
// instead of inflating the main entry chunk. Pairs with route-level lazy
// loading in AppRoutes.
//
// The `duncit` group is not about caching — it is what stops the split emitting a
// CYCLE. Rolldown's interop helpers (`__commonJS` and friends) live in a module it
// injects AFTER chunking, so no config decides where they go: neither the
// `manualChunks` callback, which is never asked about them, nor a group whose
// `test` matches their id. Left to itself the bundler folded them into whichever
// leftover workspace chunk it happened to build first — one that imports MUI —
// while MUI imported the helpers back. Two chunks, each waiting on the other, and
// the browser evaluated one while the other was still empty: staging died on the
// first line of `apollo-*.js` with `TypeError: e is not a function`, out of a
// build that reported no error at all.
//
// Naming the workspace sources leaves no unassigned chunk to fold them into, so
// rolldown emits them as their own `rolldown-runtime-*.js` that imports nothing.
// `verify-chunk-graph`, chained into `build`, is what proves that: re-run it after
// touching a group, because a cycle here is invisible until the page loads.
const VENDOR_GROUPS = [
  { name: 'duncit', test: /\/packages\/[^/]+\/src\// },
  { name: 'mui', test: /node_modules\/(@mui|@emotion)\// },
  { name: 'apollo', test: /node_modules\/(@apollo|graphql)\// },
  { name: 'quill', test: /node_modules\/(react-)?quill/ },
  { name: 'slick', test: /node_modules\/(react-slick|slick-carousel)\// },
  { name: 'lottie', test: /node_modules\/[^/]*lottie/ },
  { name: 'fontawesome', test: /node_modules\/@fortawesome\// },
];

// This package must NOT declare `"type": "module"`. Rolldown, the bundler behind
// Vite 8, reads that field to decide how a CommonJS dependency is interoped: with
// it set, `import X from 'cjs-dep'` gets NODE's ESM semantics, where the binding
// is the whole `module.exports` rather than the `exports.default` the dep put its
// component on. react-slick is such a dep — CJS only, no `exports` map, no ESM
// build — so every <Slider> on mWeb rendered a plain OBJECT and React killed the
// page with "Element type is invalid" (minified #130) on the pod, club, explore
// and shop surfaces. Nothing else catches it: the build is green, `tsc` reads the
// dep's .d.ts default, and dev + vitest pre-bundle it to real ESM, so only the
// production page dies. The field buys this app nothing — it ships no .js source.
if ('type' in pkg) {
  throw new Error(
    'app/mweb/package.json declares "type" — remove it; see the CommonJS interop note in vite.config.ts.',
  );
}

export default defineConfig({
  plugins: [react()],
  // Surface the package version to the app (shown in the profile drawer footer).
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: { port: 2003, host: true, strictPort: true },
  preview: { port: 2003, host: true, strictPort: true },
  build: {
    rollupOptions: {
      output: { advancedChunks: { groups: VENDOR_GROUPS } },
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
      '@apollo/client',
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
      '@mui/system',
      '@mui/x-date-pickers',
    ],
  },
  optimizeDeps: {
    // Pre-bundle EVERY shared React-context singleton in the first optimize
    // pass. This app serves workspace packages (e.g. @duncit/user-context) as
    // source via /@fs and lazy-loads routes — Vite's dep scanner crawls neither
    // deeply, so a dep imported only through those boundaries gets discovered
    // late and re-optimized on its own, minting a fresh `?v=` hash. When the
    // already-running page holds the old hash and a new chunk pulls the new one,
    // React/Router load twice → "Cannot read properties of null (reading
    // 'useContext')". Listing them here forces one complete optimize generation
    // up front so nothing forks mid-session. If a new context-providing dep is
    // added, add it here too (then restart dev with `--force`).
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-router',
      '@apollo/client',
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
      '@mui/material/styles',
      '@mui/icons-material',
      '@mui/x-date-pickers',
      '@mui/x-date-pickers/LocalizationProvider',
      '@mui/x-date-pickers/AdapterDateFns',
      '@mui/x-date-pickers/DateTimePicker',
      '@mui/x-date-pickers/DatePicker',
      '@mui/x-date-pickers/TimePicker',
      'react-hook-form',
      '@hookform/resolvers/zod',
      'zod',
      'date-fns',
      'react-slick',
      '@react-oauth/google',
    ],
  },
});
