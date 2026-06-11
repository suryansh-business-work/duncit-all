import type { CodegenConfig } from '@graphql-codegen/cli';

/**
 * Mobile GraphQL Code Generator. Mirrors the mWeb/admin `client` preset so
 * operations are fully typed (rule 13). The schema is read directly from the
 * server's GraphQL type definitions — the same source the server generates
 * from — keeping the contract in lock-step without a running server.
 */
const config: CodegenConfig = {
  overwrite: true,
  schema: '../../server/src/modules/**/*.schema.ts',
  ignoreNoDocuments: true,
  generates: {
    './src/generated/graphql/': {
      documents: ['./src/**/*.{ts,tsx}', '!./src/generated/**'],
      preset: 'client',
      presetConfig: {
        gqlTagName: 'gql',
      },
    },
  },
};

export default config;
