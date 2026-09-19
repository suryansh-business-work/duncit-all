import type { CodegenConfig } from '@graphql-codegen/cli';

/**
 * The `packages/gql-types` half of `codegen.ts`, run against the SDL that
 * `scripts/verify-gql-schema.mjs --emit` resolves.
 *
 * Two reasons it is separate rather than folded into `codegen.ts`:
 *
 *  - the main config still lists `../mweb-app` and `../admin` outputs, which no
 *    longer exist, so it fails before reaching the shared types;
 *  - its `schema` glob reads `*.schema.ts` as TEXT, which cannot see through
 *    the template literal podCalculator.schema.ts interpolates its shared field
 *    block into. The emit step resolves that first.
 *
 * Run it with `pnpm codegen:types` from `server/`.
 */
const config: CodegenConfig = {
  overwrite: true,
  schema: '../.codegen/server-schema.graphql',
  ignoreNoDocuments: true,
  generates: {
    '../packages/gql-types/src/schema.ts': {
      plugins: ['typescript'],
      config: {
        enumsAsTypes: true,
        skipTypename: false,
        maybeValue: 'T | null',
        scalars: { ID: 'string', DateTime: 'string', JSON: 'unknown', Upload: 'unknown' },
      },
    },
  },
};

export default config;
