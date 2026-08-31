#!/usr/bin/env node
/**
 * Fail a build whose emitted chunks import each other in a circle.
 *
 *   node scripts/verify-chunk-graph.mjs app/mweb/dist
 *
 * A `manualChunks` function decides which module lands in which file, but NOT
 * the order the browser evaluates them in — that follows the import edges
 * between the files it produced. When those edges form a cycle, one chunk in it
 * runs while another is still uninitialised, and every binding it imported from
 * that one reads `undefined`. Rollup does not warn: the bundle is valid ESM and
 * the build is green.
 *
 * mWeb shipped exactly that to staging on 2026-08-31. The CommonJS interop
 * helpers had landed in a workspace-package chunk, React's CJS build in the
 * apollo chunk, and MUI imported both — so apollo evaluated first, called
 * `__commonJS` before the helper chunk had assigned it, and the whole app died
 * on the first line of `apollo-*.js` with `TypeError: e is not a function`.
 * Nothing before the browser could have caught it, which is why this runs in
 * `build` rather than in review.
 *
 * Only STATIC edges are graded. `import("./chunk.js")` is deferred by
 * definition, so a cycle through a dynamic import is how route-level lazy
 * loading is supposed to look.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const target = process.argv[2];
if (!target) {
  console.error('verify-chunk-graph: expected a build output directory, e.g. app/mweb/dist');
  process.exit(1);
}

const root = path.resolve(target);
if (!fs.existsSync(root)) {
  console.error(`verify-chunk-graph: ${target} does not exist — run the bundler first.`);
  process.exit(1);
}

/** Every emitted .js file, keyed by the path a sibling chunk would import it as. */
function chunkFiles(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...chunkFiles(full));
    else if (entry.name.endsWith('.js')) found.push(full);
  }
  return found;
}

/**
 * The chunks one chunk pulls in BEFORE its own body runs.
 *
 * Rollup writes these three forms and no others: `import"./x.js"` for a
 * side-effect import, `…from"./x.js"` for a named one, and the same `from` for
 * a re-export — all of which the browser resolves and evaluates first.
 */
const STATIC_EDGE = /(?:\bfrom|^import|[;}]import)\s*["'](\.[^"']+\.js)["']/g;

function staticEdges(source) {
  const edges = new Set();
  for (const match of source.matchAll(STATIC_EDGE)) edges.add(match[1]);
  return edges;
}

const files = chunkFiles(root);
const graph = new Map();
for (const file of files) {
  const from = path.relative(root, file).replaceAll('\\', '/');
  const dir = path.dirname(file);
  const to = [...staticEdges(fs.readFileSync(file, 'utf8'))]
    .map((spec) => path.relative(root, path.resolve(dir, spec)).replaceAll('\\', '/'))
    .filter((name) => name !== from);
  graph.set(from, to);
}

/** The first cycle reachable from `start`, as the list of chunks that form it. */
function findCycle(start, state, stack) {
  state.set(start, 'visiting');
  stack.push(start);
  for (const next of graph.get(start) ?? []) {
    if (!graph.has(next)) continue;
    const seen = state.get(next);
    if (seen === 'visiting') return [...stack.slice(stack.indexOf(next)), next];
    if (seen === undefined) {
      const cycle = findCycle(next, state, stack);
      if (cycle) return cycle;
    }
  }
  stack.pop();
  state.set(start, 'done');
  return null;
}

const state = new Map();
for (const chunk of graph.keys()) {
  if (state.has(chunk)) continue;
  const cycle = findCycle(chunk, state, []);
  if (!cycle) continue;
  console.error(`verify-chunk-graph: ${target} emits chunks that import each other in a circle.`);
  console.error(`  ${cycle.join('\n    -> ')}`);
  console.error(
    '\nOne of these evaluates while the next is still empty, so every binding it\n' +
      'imports from that one is `undefined` at module scope — the page throws on\n' +
      'load with no build error behind it. Group the shared modules so the chunk\n' +
      'they live in imports nothing from the chunks that need them (see the\n' +
      '`vendorChunk` comment in app/mweb/vite.config.ts).',
  );
  process.exit(1);
}

console.log(`verify-chunk-graph: ${graph.size} chunk(s) in ${target}, no circular imports.`);
