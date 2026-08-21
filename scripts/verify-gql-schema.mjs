#!/usr/bin/env node
/**
 * Validate every client GraphQL document AGAINST THE SCHEMA.
 *
 * The gap this closes. `server check:schema` proves the SDL builds.
 * `verify-gql-documents` proves each client document parses. NEITHER compares
 * one to the other — so a query naming a field the schema does not have, or
 * passing an argument by the wrong name, is green in CI and a runtime error in
 * the browser. It found `publicUsersByIds(ids:)` on a live mWeb page where the
 * schema has always wanted `user_ids`.
 *
 * Static, like its sibling. An earlier version imported the server's module
 * graph to get `typeDefs`, which is how the real schema is assembled — but
 * nothing in CI had ever imported that graph before (`check:schema` runs
 * nowhere), and it failed there while passing locally. Both sides are read as
 * TEXT now: no ts-node, no env, no side effects at import, and the same
 * technique on the schema as on the documents.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { buildASTSchema, concatAST, parse, validate, Kind } = require(
  require.resolve('graphql', {
    paths: [path.join(repoRoot, 'server'), path.join(repoRoot, 'app', 'mweb'), repoRoot],
  }),
);

const CLIENT_ROOTS = ['packages', 'portals', 'app/mweb', 'app/mobile-app'];
const SCHEMA_ROOT = 'server/src';
// __tests__ is skipped on the client side: a test may query a deliberately fake
// field to exercise an error path, which is not a schema defect.
const SKIP = new Set(['node_modules', 'dist', 'build', 'coverage', '.git', 'generated', '__tests__']);

/**
 * Where a template literal starts: after gql, graphql, or a GraphQL comment.
 *
 * The lookbehind rejects a backtick-quoted mention of the tag in prose — a
 * comment reading "wrap the SDL with this portal's own `gql`" ends in the exact
 * characters a template head is made of, so the scanner opened a "template"
 * there and read to the next backtick in the file, swallowing every real
 * document after it. portals/tech/src/pages/slack/queries.ts was unvalidated
 * that way, and reported as success, because the count of skipped documents is
 * the only trace and nobody reads it.
 */
const TEMPLATE_HEAD = /(?<!`)(?:\bgql|\bgraphql|\/\*\s*GraphQL\s*\*\/)\s*`/g;
/** `const NAME = ` immediately before a template literal. */
const CONSTANT_HEAD = /(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*`/g;

/**
 * Read a template literal body starting just after its opening backtick,
 * honouring backslash escapes.
 *
 * Scanned rather than matched with `` `((?:[^`\\]|\\[\s\S])*)` ``: that shape is
 * flagged as ReDoS-prone, and a plain non-greedy `[\s\S]*?` is WRONG — several
 * SDL descriptions quote a field name in escaped backticks, so it stops at the
 * first one, truncates the block, and loses every type declared after it. That
 * surfaced as a pile of "Cannot query field X on type Mutation" for fields that
 * plainly exist.
 *
 * @returns the body and the index just past the closing backtick, or null when
 *   the literal is unterminated.
 */
function readTemplateBody(source, start) {
  let out = '';
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (ch === '\\') {
      const next = source[i + 1];
      // An escaped backtick is a literal backtick once the template evaluates.
      out += next === '`' ? '`' : ch + (next ?? '');
      i++;
      continue;
    }
    if (ch === '`') return { body: out, end: i + 1 };
    out += ch;
  }
  return null;
}

/** Every gql/graphql template literal in a source file. */
function templatesIn(source) {
  const found = [];
  TEMPLATE_HEAD.lastIndex = 0;
  while (TEMPLATE_HEAD.exec(source) !== null) {
    const read = readTemplateBody(source, TEMPLATE_HEAD.lastIndex);
    if (!read) break;
    found.push(read.body);
    TEMPLATE_HEAD.lastIndex = read.end;
  }
  return found;
}
/** One piece of leading trivia: a description (block or single-line) or a comment. */
const LEADING_TRIVIA = /^\s*(?:"""[\s\S]*?"""|"[^"\n]*"|#[^\n]*\n)/;
/** A template that opens with one of these (after any trivia) is SDL, not an operation. */
const SDL_KEYWORD = /^\s*(?:type|extend|enum|input|interface|union|scalar|directive|schema)\b/;
const OPERATION_START = /^\s*(query|mutation|subscription|fragment)\b/;

/** True when the template is SDL: strip leading descriptions/comments, then look for a keyword. */
function isSdlStart(source) {
  let rest = source;
  let trivia;
  while ((trivia = LEADING_TRIVIA.exec(rest)) !== null) {
    rest = rest.slice(trivia[0].length);
  }
  return SDL_KEYWORD.test(rest);
}

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

function readConstants(source) {
  const map = new Map();
  CONSTANT_HEAD.lastIndex = 0;
  let head;
  while ((head = CONSTANT_HEAD.exec(source)) !== null) {
    const read = readTemplateBody(source, CONSTANT_HEAD.lastIndex);
    if (!read) break;
    map.set(head[1], read.body);
    CONSTANT_HEAD.lastIndex = read.end;
  }
  return map;
}

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

/** Every SDL block in the server, as one document. */
function collectSchemaAst() {
  const docs = [];
  for (const file of walk(path.join(repoRoot, SCHEMA_ROOT))) {
    const source = readFileSync(file, 'utf8');
    const constants = readConstants(source);
    for (const template of templatesIn(source)) {
      const sdl = resolveConstants(template, constants);
      if (!isSdlStart(sdl) || sdl.includes('${')) continue;
      try {
        docs.push(parse(sdl));
      } catch {
        // A malformed SDL block is server check:schema's job to report.
      }
    }
  }
  return concatAST(docs);
}

const MERGEABLE = new Set([
  Kind.OBJECT_TYPE_DEFINITION,
  Kind.INPUT_OBJECT_TYPE_DEFINITION,
  Kind.INTERFACE_TYPE_DEFINITION,
]);

const collisions = new Set();

/**
 * Fold repeated type definitions into one, the way the server's schema builder
 * does. Without this the gate produces confident nonsense: the repo defines
 * `CrmServiceOffered` twice — a lead's service and a catalogue entry — and a
 * plain build keeps one and calls every field of the other missing.
 */
function mergeDuplicateTypes(doc) {
  const byName = new Map();
  const output = [];
  for (const def of doc.definitions) {
    if (!MERGEABLE.has(def.kind) || !def.name) {
      output.push(def);
      continue;
    }
    const seen = byName.get(def.name.value);
    if (!seen) {
      const copy = { ...def, fields: [...(def.fields ?? [])] };
      byName.set(def.name.value, copy);
      output.push(copy);
      continue;
    }
    collisions.add(def.name.value);
    const have = new Set(seen.fields.map((f) => f.name.value));
    for (const field of def.fields ?? []) {
      if (!have.has(field.name.value)) seen.fields.push(field);
    }
  }
  return { ...doc, definitions: output };
}

/** True when every fragment the document spreads is also defined in it. */
function isSelfContained(doc) {
  const defined = new Set(
    doc.definitions.filter((d) => d.kind === Kind.FRAGMENT_DEFINITION).map((d) => d.name.value)
  );
  const spreads = [];
  JSON.stringify(doc, (key, value) => {
    if (value && typeof value === 'object' && value.kind === Kind.FRAGMENT_SPREAD) {
      spreads.push(value.name.value);
    }
    return value;
  });
  return spreads.every((name) => defined.has(name));
}

/**
 * A template as a document worth validating, or null to skip it.
 *
 * Null means "cannot be judged", never "fine": an unresolved interpolation, a
 * fragment defined for another file to spread, or a syntax error that
 * verify-gql-documents already owns.
 */
function checkableDocument(raw, constants) {
  const resolved = resolveConstants(raw, constants);
  if (!OPERATION_START.test(resolved) || resolved.includes('${')) return null;
  let doc;
  try {
    doc = parse(resolved);
  } catch {
    return null;
  }
  const hasOperation = doc.definitions.some((d) => d.kind === Kind.OPERATION_DEFINITION);
  if (!hasOperation || !isSelfContained(doc)) return null;
  return doc;
}

const schemaAst = collectSchemaAst();
if (schemaAst.definitions.length === 0) {
  console.error('verify-gql-schema: found no SDL in server/src — refusing to report success.');
  process.exit(1);
}
const schema = buildASTSchema(mergeDuplicateTypes(schemaAst), { assumeValidSDL: true });

const failures = [];
let checked = 0;
let skipped = 0;

for (const file of CLIENT_ROOTS.flatMap((root) => walk(path.join(repoRoot, root)))) {
  const source = readFileSync(file, 'utf8');
  const constants = readConstants(source);
  // Tagged templates, plus the UNTAGGED constants a shared package exports for
  // its consumers to wrap (`export const X_SDL = ...`, then `gql(X_SDL)` in
  // each portal). Rule 40 pushes operations INTO those packages, so validating
  // only what carries a gql tag leaves the single-sourced copy — the one every
  // consumer runs — as the one nothing checks.
  // Only operation-shaped constants: every other template literal in the file
  // (a CSS block, a shell snippet) would otherwise be counted as a skipped
  // document and bury the skip figure under noise.
  const sdlConstants = [...constants.values()].filter((body) => OPERATION_START.test(body));
  const candidates = [...templatesIn(source), ...sdlConstants];
  for (const template of candidates) {
    const doc = checkableDocument(template, constants);
    if (!doc) {
      skipped++;
      continue;
    }
    checked++;
    for (const error of validate(schema, doc)) {
      failures.push({ file: path.relative(repoRoot, file), message: error.message });
    }
  }
}

if (failures.length > 0) {
  console.error(`verify-gql-schema: ${failures.length} document error(s):`);
  for (const f of failures) console.error(`  ${f.file}\n    ${f.message}`);
  process.exit(1);
}

console.log(
  `verify-gql-schema: ${checked} document(s) match the schema (${skipped} skipped as interpolated or fragment-dependent)`
);
if (collisions.size > 0) {
  // A warning, not a failure: these predate the gate, the builder folds them so
  // nothing is broken today, and failing here would block unrelated work.
  console.warn(
    `\nWARNING — ${collisions.size} type name(s) defined more than once: ${[...collisions].join(', ')}\n` +
      'The builder folds them into one type, so a caller can select fields that\n' +
      'belong to the other definition and always read null. Give each concept its\n' +
      'own name.'
  );
}
