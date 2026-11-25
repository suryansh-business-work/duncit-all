import type { CodegenConfig } from '@graphql-codegen/cli';

/**
 * Typed operations from the server's own type definitions — the same source
 * the CRM portal and the server generate from — so the app stays in lock-step
 * with the API without a running server.
 */
const config: CodegenConfig = {
  overwrite: true,
  schema: [
    '../../server/src/modules/**/*.schema.ts',
    '../../server/src/microservices/**/*.schema.ts',
  ],
  ignoreNoDocuments: true,
  generates: {
    './src/generated/graphql/': {
      documents: ['./src/**/*.{ts,tsx}', '!./src/generated/**'],
      preset: 'client',
      presetConfig: { gqlTagName: 'gql', fragmentMasking: false },
      // Enums as string unions: a lead kind is the same 'VENUE_LEAD' string in
      // the API, the call directory file and the deep links.
      config: { enumsAsTypes: true },
    },
  },
};

export default config;
