/**
 * The platform's slice of the assembled GraphQL schema: every module's SDL
 * parses together with everyone else's, and every query and mutation a platform
 * resolver file registers is a field the schema declares.
 *
 * A resolver for a field that is not in the schema is dead code that looks
 * live; it is one misspelt name away, and a module's own tests never see it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ApolloServer } from '@apollo/server';
import { resolvers, typeDefs } from '@modules';

type ResolverMap = Record<string, Record<string, unknown> | undefined>;

const PLATFORM_DIR = path.resolve(__dirname, '../..');

const SCHEMA_FIELDS = /* GraphQL */ `
  query SchemaFields {
    __schema {
      queryType { fields { name } }
      mutationType { fields { name } }
    }
  }
`;

/** Every `*.resolver.ts` under the platform modules, as the maps it exports. */
function platformResolverMaps(directory: string): Array<{ file: string; map: ResolverMap }> {
  const found: Array<{ file: string; map: ResolverMap }> = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') found.push(...platformResolverMaps(full));
    } else if (entry.name.endsWith('.resolver.ts')) {
      const exported = require(full) as Record<string, unknown>;
      for (const value of Object.values(exported)) {
        const candidate = value as ResolverMap;
        if (candidate && typeof candidate === 'object' && (candidate.Query || candidate.Mutation)) {
          found.push({ file: path.relative(PLATFORM_DIR, full), map: candidate });
        }
      }
    }
  }
  return found;
}

let server: ApolloServer;
let queryFields: Set<string>;
let mutationFields: Set<string>;

beforeAll(async () => {
  server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  const response = await server.executeOperation({ query: SCHEMA_FIELDS });
  if (response.body.kind !== 'single') throw new Error('Expected a single response');
  const schema = (response.body.singleResult.data as {
    __schema: { queryType: { fields: Array<{ name: string }> }; mutationType: { fields: Array<{ name: string }> } };
  }).__schema;
  queryFields = new Set(schema.queryType.fields.map((field) => field.name));
  mutationFields = new Set(schema.mutationType.fields.map((field) => field.name));
}, 120_000);

afterAll(async () => {
  await server.stop();
});

describe('the assembled schema', () => {
  it('declares queries and mutations', () => {
    expect(queryFields.size).toBeGreaterThan(100);
    expect(mutationFields.size).toBeGreaterThan(100);
  });

  it('finds the platform resolver files it is meant to check', () => {
    const files = platformResolverMaps(PLATFORM_DIR).map((entry) => entry.file);
    expect(files.length).toBeGreaterThan(30);
    expect(files.some((file) => file.endsWith('statusReport.resolver.ts'))).toBe(true);
  });

  it('has a declared field behind every platform query resolver', () => {
    const missing = platformResolverMaps(PLATFORM_DIR).flatMap(({ file, map }) =>
      Object.keys(map.Query ?? {}).filter((name) => !queryFields.has(name)).map((name) => `${file}: ${name}`),
    );
    expect(missing).toEqual([]);
  });

  it('has a declared field behind every platform mutation resolver', () => {
    const missing = platformResolverMaps(PLATFORM_DIR).flatMap(({ file, map }) =>
      Object.keys(map.Mutation ?? {}).filter((name) => !mutationFields.has(name)).map((name) => `${file}: ${name}`),
    );
    expect(missing).toEqual([]);
  });
});
