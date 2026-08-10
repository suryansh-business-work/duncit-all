#!/usr/bin/env node
/**
 * Parse every client-side GraphQL document in the repo.
 *
 * `tsc` and Vite treat a gql template as an opaque string, and the portals parse
 * it at MODULE LOAD — so a malformed document type-checks, builds, ships, and
 * then throws "Syntax Error: Unexpected }" in the browser console with a
 * minified stack. Every other gate was green for exactly that bug.
 *
 * Static, not dynamic: importing these modules would need the bundler's
 * resolution (@apollo/client, workspace aliases), and a swallowed import error
 * makes the gate quietly pass — which is how the first version of this script
 * reported "clean" on the very document that was broken.
 *
 * `${...}` interpolations become a placeholder FIELD, so the surrounding braces
 * still have to balance. That is what catches a selection spliced in with one
 * brace too few, which is the failure this exists for.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Resolved from the server workspace: this script runs at the repo root, which
// has no direct graphql dependency of its own.
const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { parse } = require(
  require.resolve('graphql', {
    paths: [path.join(repoRoot, 'server'), path.join(repoRoot, 'app', 'mweb'), repoRoot],
  }),
);

// Client documents only. The server's SDL has its own gate (server check:schema),
// which builds the real executable schema rather than parsing text.
const ROOTS = ['packages', 'portals', 'app/mweb', 'app/mobile-app'];
const SKIP = new Set(['node_modules', 'dist', 'build', 'coverage', '.git', 'generated']);
// Matches gql`...`, graphql`...` and /* GraphQL */ `...`.
const TEMPLATE = /(?:\bgql|\bgraphql|\/\*\s*GraphQL\s*\*\/)\s*`([\s\S]*?)`/g;

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (SKIP.has(entry)) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

/**
 * Every `const NAME = \`…\`` in a file, so an interpolated selection can be
 * substituted for real rather than papered over with a placeholder.
 *
 * Plain string literals only — a template that itself interpolates is left for
 * the placeholder path, which still balances braces.
 */
function readConstants(source) {
  const map = new Map();
  const re = /(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*`([^`]*)`/g;
  let m;
  while ((m = re.exec(source)) !== null) map.set(m[1], m[2]);
  return map;
}

/** Replace `${NAME}` with the constant's text, repeatedly, so a selection built
 * from another selection resolves too. Bounded, because a constant that refers
 * to itself would otherwise spin forever. */
function resolveConstants(text, constants) {
  let out = text;
  for (let pass = 0; pass < 5; pass++) {
    const next = out.replaceAll(/\$\{\s*([A-Za-z_$][\w$]*)\s*\}/g, (whole, name) =>
      constants.has(name) ? constants.get(name) : whole
    );
    if (next === out) break;
    out = next;
  }
  return out;
}

const failures = [];
let parsed = 0;

for (const file of ROOTS.flatMap((root) => walk(root))) {
  const source = readFileSync(file, 'utf8');
  TEMPLATE.lastIndex = 0;
  let match;
  const constants = readConstants(source);
  TEMPLATE.lastIndex = 0;
  while ((match = TEMPLATE.exec(source)) !== null) {
    // Substitute the REAL value of any `${CONST}` whose template literal is
    // declared in this file, before falling back to a placeholder.
    //
    // This is the check that was missing. Replacing every interpolation with a
    // placeholder FIELD keeps the braces balanced by construction, so a shared
    // selection carrying one closing brace too many parsed here and blew up in
    // the browser — which is exactly what took admin and partners-app down: the
    // extracted `ATTENDEE_SELECTION` and its four siblings each swallowed the
    // root field's `}`, and the query template closed it a second time.
    const resolved = resolveConstants(match[1], constants);
    const doc = resolved.replaceAll(/\$\{[^}]*\}/g, '__interpolated');
    // Only a template that OPENS with an operation/fragment keyword is a
    // document. The regex also matches graphqlRequest(...) and similar, whose
    // backticks hold ordinary strings.
    if (!/^\s*(query|mutation|subscription|fragment)\b/.test(doc)) continue;
    // A document-level interpolation is a fragment being appended, where a
    // field placeholder is not valid — accept either reading, so long as ONE
    // parses. Both keep the braces balanced, which is the check that matters.
    const alternative = resolved.replaceAll(/\$\{[^}]*\}/g, '');
    try {
      try {
        parse(doc);
      } catch {
        parse(alternative);
      }
      parsed += 1;
    } catch (err) {
      failures.push({ file, message: String(err?.message ?? err).split('\n')[0] });
    }
  }
}

if (failures.length > 0) {
  console.error(`verify-gql-documents: ${failures.length} document(s) do not parse:`);
  for (const f of failures) console.error(`  ${f.file}\n    ${f.message}`);
  process.exit(1);
}
console.log(`verify-gql-documents: ${parsed} GraphQL document(s) parse cleanly`);
