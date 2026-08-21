/**
 * An Apollo link that answers ANY operation with data of the right shape.
 *
 * Mounting a page with nothing behind it proves it survives a failed request,
 * but it never renders the half that matters — the rows, the cards, the chips,
 * the formatted money and dates. Hand-writing a mock per page is not something
 * anyone will keep current across four hundred screens, so this reads the
 * server's own SDL and lets graphql-js execute the operation against it with a
 * field resolver that fabricates values. The SHAPE is therefore always right: a
 * list field really is a list, an enum is one of its own members, and a
 * non-null field is never null.
 *
 * It is deliberately not a fixture library. The values are dull and
 * deterministic; what it buys is that every render path which needs data runs
 * at all.
 *
 * GENERATED, one copy per workspace, because neither place that could hold it
 * can: pnpm's isolated layout means a package may only import what it declares
 * and `graphql` is not a dependency of @duncit/gql-types, while putting it in
 * @duncit/shell would add lines to that package's own coverage for code only
 * its consumers ever run.
 */
import fs from 'node:fs';
import path from 'node:path';

import { ApolloLink, Observable } from '@apollo/client';
import {
  GraphQLEnumType,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLUnionType,
  Kind,
  buildASTSchema,
  concatAST,
  execute,
  parse,
  type DocumentNode,
  type GraphQLOutputType,
  type GraphQLSchema,
} from 'graphql';

/** Where the server's SDL lives, found by walking up from the workspace. */
function findServerSrc(): string | null {
  let dir = process.cwd();
  for (let up = 0; up < 6; up += 1) {
    const candidate = path.join(dir, 'server', 'src');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', '__tests__']);

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith('.schema.ts')) out.push(full);
  }
  return out;
}

const BACKTICK = String.fromCharCode(96);

/**
 * Read a template literal body from just past its opening backtick.
 *
 * Scanned rather than matched: several SDL descriptions quote a field name in
 * escaped backticks, and a non-greedy pattern stops at the first one and loses
 * every type declared after it. Same reasoning as scripts/verify-gql-schema.mjs.
 */
function readTemplateBody(source: string, start: number): { body: string; end: number } | null {
  let out = '';
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '\\') {
      const next = source[i + 1];
      out += next === BACKTICK ? BACKTICK : ch + (next ?? '');
      i += 1;
      continue;
    }
    if (ch === BACKTICK) return { body: out, end: i + 1 };
    out += ch;
  }
  return null;
}

const TEMPLATE_HEAD = new RegExp(
  '(?<!' + BACKTICK + ')(?:\\bgql|\\bgraphql|/\\*\\s*GraphQL\\s*\\*/)\\s*' + BACKTICK,
  'g'
);
const CONSTANT_HEAD = new RegExp('(?:export\\s+)?const\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*' + BACKTICK, 'g');
const LEADING_TRIVIA = /^\s*(?:"""[\s\S]*?"""|"[^"\n]*"|#[^\n]*\n)/;
const SDL_KEYWORD = /^\s*(?:type|extend|enum|input|interface|union|scalar|directive|schema)\b/;

function templatesIn(source: string): string[] {
  const found: string[] = [];
  TEMPLATE_HEAD.lastIndex = 0;
  while (TEMPLATE_HEAD.exec(source) !== null) {
    const read = readTemplateBody(source, TEMPLATE_HEAD.lastIndex);
    if (!read) break;
    found.push(read.body);
    TEMPLATE_HEAD.lastIndex = read.end;
  }
  return found;
}

function readConstants(source: string): Map<string, string> {
  const map = new Map<string, string>();
  CONSTANT_HEAD.lastIndex = 0;
  let head = CONSTANT_HEAD.exec(source);
  while (head !== null) {
    const read = readTemplateBody(source, CONSTANT_HEAD.lastIndex);
    if (!read) break;
    map.set(head[1] as string, read.body);
    CONSTANT_HEAD.lastIndex = read.end;
    head = CONSTANT_HEAD.exec(source);
  }
  return map;
}

function resolveConstants(text: string, constants: Map<string, string>): string {
  let out = text;
  for (let pass = 0; pass < 5; pass += 1) {
    const next = out.replaceAll(/\$\{\s*([A-Za-z_$][\w$]*)\s*\}/g, (whole, name: string) =>
      constants.has(name) ? (constants.get(name) as string) : whole
    );
    if (next === out) break;
    out = next;
  }
  return out;
}

function isSdlStart(source: string): boolean {
  let rest = source;
  let trivia = LEADING_TRIVIA.exec(rest);
  while (trivia !== null) {
    rest = rest.slice(trivia[0].length);
    trivia = LEADING_TRIVIA.exec(rest);
  }
  return SDL_KEYWORD.test(rest);
}

const MERGEABLE = new Set<string>([
  Kind.OBJECT_TYPE_DEFINITION,
  Kind.INPUT_OBJECT_TYPE_DEFINITION,
  Kind.INTERFACE_TYPE_DEFINITION,
]);

interface MergeableNode {
  kind: string;
  name?: { value: string };
  fields?: { name: { value: string } }[];
}

/**
 * Fold repeated type definitions into one, the way the server's own builder
 * does — the repo defines a couple of types twice on purpose, and a plain build
 * keeps one and calls every field of the other missing.
 */
function mergeDuplicateTypes(doc: DocumentNode): DocumentNode {
  const byName = new Map<string, MergeableNode>();
  const output: unknown[] = [];
  for (const def of doc.definitions) {
    const node = def as unknown as MergeableNode;
    if (!MERGEABLE.has(node.kind) || !node.name) {
      output.push(def);
      continue;
    }
    const seen = byName.get(node.name.value);
    if (!seen) {
      const copy: MergeableNode = { ...node, fields: [...(node.fields ?? [])] };
      byName.set(node.name.value, copy);
      output.push(copy);
      continue;
    }
    const have = new Set((seen.fields ?? []).map((f) => f.name.value));
    for (const field of node.fields ?? []) {
      if (!have.has(field.name.value)) seen.fields?.push(field);
    }
  }
  return { ...doc, definitions: output } as unknown as DocumentNode;
}

let cached: GraphQLSchema | null | undefined;

/** The server schema, built once per test file. Null when it cannot be read. */
export function serverSchema(): GraphQLSchema | null {
  if (cached !== undefined) return cached;
  const root = findServerSrc();
  if (!root) {
    cached = null;
    return cached;
  }
  const docs: DocumentNode[] = [];
  for (const file of walk(root)) {
    const source = fs.readFileSync(file, 'utf8');
    const constants = readConstants(source);
    for (const template of templatesIn(source)) {
      const sdl = resolveConstants(template, constants);
      if (!isSdlStart(sdl) || sdl.includes('${')) continue;
      try {
        docs.push(parse(sdl));
      } catch {
        // A malformed block is the server's own check:schema gate to report.
      }
    }
  }
  try {
    cached = buildASTSchema(mergeDuplicateTypes(concatAST(docs)), { assumeValidSDL: true });
  } catch {
    cached = null;
  }
  return cached;
}

const ISO = '2026-08-30T12:30:00.000Z';

/** A dull, deterministic value for a leaf, chosen from the field's name. */
function scalarValue(typeName: string, fieldName: string): unknown {
  const name = fieldName.toLowerCase();
  if (typeName === 'ID') return (fieldName || 'id') + '-1';
  if (typeName === 'Int') return 3;
  if (typeName === 'Float') return 100.5;
  if (typeName === 'Boolean') return !name.includes('deleted') && !name.includes('disabled');
  if (typeName !== 'String') return null; // custom scalars (JSON, Upload…)
  if (name.endsWith('_at') || name.includes('date') || name.includes('time')) return ISO;
  if (name.includes('email')) return 'smoke@duncit.com';
  if (name.includes('url') || name.includes('image') || name.includes('photo') || name.includes('avatar')) {
    return 'https://cdn.duncit.com/smoke.jpg';
  }
  if (name.includes('phone')) return '9000000000';
  if (name.includes('slug')) return 'smoke-slug';
  if (name.includes('color') || name.includes('colour')) return '#4F46E5';
  return fieldName || 'Smoke';
}

function fabricate(type: GraphQLOutputType, fieldName: string): unknown {
  if (type instanceof GraphQLNonNull) return fabricate(type.ofType as GraphQLOutputType, fieldName);
  if (type instanceof GraphQLList) {
    const inner = type.ofType as GraphQLOutputType;
    return [fabricate(inner, fieldName), fabricate(inner, fieldName)];
  }
  if (type instanceof GraphQLEnumType) return type.getValues()[0]?.value ?? null;
  if (type instanceof GraphQLScalarType) return scalarValue(type.name, fieldName);
  if (type instanceof GraphQLObjectType || type instanceof GraphQLInterfaceType || type instanceof GraphQLUnionType) {
    // graphql-js walks into the selection set from here and calls the field
    // resolver again for each child, so an empty object is all that is needed.
    return {};
  }
  return null;
}

/**
 * An ApolloLink that fabricates a correctly-shaped answer for every operation.
 *
 * Falls back to an empty answer when the SDL cannot be read, so a suite using
 * it degrades to the no-data smoke rather than failing outright.
 */
export function schemaMockLink(): ApolloLink {
  const schema = serverSchema();

  return new ApolloLink(
    (operation) =>
      new Observable<{ data: unknown }>((observer) => {
        if (!schema) {
          observer.next({ data: null });
          observer.complete();
          return;
        }
        Promise.resolve(
          execute({
            schema,
            document: operation.query,
            variableValues: operation.variables,
            fieldResolver: (_source, _args, _context, info) => fabricate(info.returnType, info.fieldName),
            typeResolver: (_value, _context, _info, abstractType) =>
              schema.getPossibleTypes(abstractType)[0]?.name,
          })
        )
          .then((result) => {
            observer.next({ data: result.data ?? null });
            observer.complete();
          })
          .catch(() => {
            observer.next({ data: null });
            observer.complete();
          });
      }) as never
  );
}
