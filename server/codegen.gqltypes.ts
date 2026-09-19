import type { CodegenConfig } from '@graphql-codegen/cli';

/**
 * TEMPORARY: the `packages/gql-types` half of `codegen.ts` on its own.
 *
 * The main config still lists `../mweb-app` and `../admin` outputs, which no
 * longer exist, so `pnpm codegen` fails before it reaches the shared types.
 * This runs only the target that still has a home.
 */
const config: CodegenConfig = {
  overwrite: true,
  schema: 'src/modules/**/*.schema.ts',
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
