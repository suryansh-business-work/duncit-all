/**
 * Validate every client GraphQL document AGAINST THE REAL SCHEMA.
 *
 *   npm --prefix server run check:client-documents
 *
 * The gap this closes. `check:schema` proves the SDL builds. `verify-gql-documents`
 * proves each client document PARSES. Neither compares one to the other — so a
 * query asking for a field the schema does not have passes both gates and fails
 * in the browser at runtime.
 *
 * That is not hypothetical: renaming `ClubPodSummary.clubs` to `scope_count`, the
 * client was pointed at the new name while the SDL still had the old one. Both
 * existing gates were green. It is the same shape of hole as the malformed
 * `${SELECTION}` that took admin and partners-app down — something true of the
 * document in isolation, false against the thing it talks to.
 *
 * Deliberately conservative. A document is checked only when it can be resolved
 * to something complete and self-contained:
 *   - `${CONST}` is substituted from a template literal in the same file
 *   - anything still carrying `${…}` afterwards is SKIPPED, not guessed at
 *   - a document spreading a fragment it does not define is SKIPPED
 * Skips are counted and printed, so the coverage this gate actually provides is
 * visible rather than implied.
 */
import 'dotenv/config';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import {
  buildASTSchema,
  concatAST,
  parse,
  validate,
  Kind,
  type DocumentNode,
  type GraphQLSchema,
} from 'graphql';
import { typeDefs } from '../src/modules';

const REPO = path.resolve(__dirname, '..', '..');
const ROOTS = ['packages', 'portals', 'app/mweb', 'app/mobile-app'];
// __tests__ is skipped: a test may query a deliberately fake field to exercise
// an error path, and that is not a schema defect.
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.git',
  'generated',
  '__tests__',
]);

/** Matches gql`…`, graphql`…` and /* GraphQL *\/ `…`. */
const TEMPLATE = /(?:\bgql|\bgraphql|\/\*\s*GraphQL\s*\*\/)\s*`([\s\S]*?)`/g;
const CONSTANT = /(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*`([^`]*)`/g;

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

function readConstants(source: string): Map<string, string> {
  const map = new Map<string, string>();
  let m: RegExpExecArray | null;
  CONSTANT.lastIndex = 0;
  while ((m = CONSTANT.exec(source)) !== null) map.set(m[1], m[2]);
  return map;
}

function resolveConstants(text: string, constants: Map<string, string>): string {
  let out = text;
  for (let pass = 0; pass < 5; pass++) {
    const next = out.replaceAll(/\$\{\s*([A-Za-z_$][\w$]*)\s*\}/g, (whole, name: string) =>
      constants.has(name) ? (constants.get(name) as string) : whole,
    );
    if (next === out) break;
    out = next;
  }
  return out;
}

/** Type kinds whose repeated definitions the server's builder folds together. */
const MERGEABLE = new Set<string>([
  Kind.OBJECT_TYPE_DEFINITION,
  Kind.INPUT_OBJECT_TYPE_DEFINITION,
  Kind.INTERFACE_TYPE_DEFINITION,
]);

/**
 * Fold repeated type definitions into one, the way the server's schema builder
 * does. Names collected here are reported afterwards: two definitions of one
 * type name means two different concepts wearing the same name at runtime, and
 * whichever fields a caller selects, half of them can only ever be null.
 */
const collisions = new Set<string>();

function mergeDuplicateTypes(doc: DocumentNode): DocumentNode {
  const byName = new Map<string, any>();
  const output: any[] = [];
  for (const def of doc.definitions as any[]) {
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
    const have = new Set(seen.fields.map((f: any) => f.name.value));
    for (const field of def.fields ?? []) {
      if (!have.has(field.name.value)) seen.fields.push(field);
    }
  }
  return { ...doc, definitions: output };
}

/** True when every fragment the document spreads is also defined in it. */
function isSelfContained(doc: DocumentNode): boolean {
  const defined = new Set(
    doc.definitions
      .filter((d) => d.kind === Kind.FRAGMENT_DEFINITION)
      .map((d) => (d as any).name.value as string),
  );
  const spreads: string[] = [];
  JSON.stringify(doc, (key, value) => {
    if (value && typeof value === 'object' && (value as any).kind === Kind.FRAGMENT_SPREAD) {
      spreads.push((value as any).name.value);
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
function checkableDocument(raw: string, constants: Map<string, string>): DocumentNode | null {
  const resolved = resolveConstants(raw, constants);
  if (!/^\s*(query|mutation|subscription|fragment)\b/.test(resolved)) return null;
  if (resolved.includes('${')) return null;
  let doc: DocumentNode;
  try {
    doc = parse(resolved);
  } catch {
    return null;
  }
  // A file may export a fragment on its own, to be interpolated elsewhere.
  // Validated alone it is only ever "never used", which says nothing.
  const hasOperation = doc.definitions.some((d) => d.kind === Kind.OPERATION_DEFINITION);
  if (!hasOperation || !isSelfContained(doc)) return null;
  return doc;
}

function main(): void {
  // Built from the SAME typeDefs the server boots with.
  //
  // Duplicate type names are MERGED first, because that is what the server's
  // schema builder does and validating against anything else produces
  // confident nonsense: the repo has two different `CrmServiceOffered`
  // definitions, and a plain buildASTSchema keeps one and reports every field
  // of the other as missing. (That collision is a real problem in its own
  // right — see the note printed at the end.)
  const merged = mergeDuplicateTypes(
    concatAST((typeDefs as any[]).map((td) => (typeof td === 'string' ? parse(td) : td))),
  );
  const schema: GraphQLSchema = buildASTSchema(merged, { assumeValidSDL: true });

  const failures: { file: string; message: string }[] = [];
  let checked = 0;
  let skipped = 0;

  for (const file of ROOTS.flatMap((root) => walk(path.join(REPO, root)))) {
    const source = readFileSync(file, 'utf8');
    const constants = readConstants(source);
    TEMPLATE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = TEMPLATE.exec(source)) !== null) {
      const doc = checkableDocument(match[1], constants);
      if (!doc) {
        skipped++;
        continue;
      }
      checked++;
      const errors = validate(schema, doc);
      for (const error of errors) {
        failures.push({
          file: path.relative(REPO, file),
          message: error.message,
        });
      }
    }
  }

  if (failures.length > 0) {
    console.error(`check:client-documents — ${failures.length} document error(s):`);
    for (const f of failures) console.error(`  ${f.file}\n    ${f.message}`);
    process.exit(1);
  }
  console.log(
    `check:client-documents: ${checked} document(s) validate against the schema (${skipped} skipped as interpolated or fragment-dependent)`,
  );
  if (collisions.size > 0) {
    // A warning, not a failure: these predate this gate, and failing the build
    // on them would block every unrelated change until they are untangled.
    console.warn(
      `\nWARNING — ${collisions.size} type name(s) defined more than once: ${[...collisions].join(', ')}\n` +
        'The builder folds them into one type, so a caller can select fields that\n' +
        'belong to the other definition and always read null. Give each concept\n' +
        'its own name.',
    );
  }
}

main();
