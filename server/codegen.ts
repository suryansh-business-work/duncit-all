import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: 'src/modules/**/*.schema.ts',
  ignoreNoDocuments: true,
  generates: {
    'src/generated/graphql.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        contextType: '../context#GraphQLContext',
        useIndexSignature: true,
      },
    },
    '../mweb-app/src/generated/graphql/': {
      documents: ['../mweb-app/src/**/*.{graphql,ts,tsx}', '!../mweb-app/src/generated/**'],
      preset: 'client',
      presetConfig: {
        gqlTagName: 'gql',
      },
    },
    '../admin/src/generated/graphql/': {
      documents: ['../admin/src/**/*.{graphql,ts,tsx}', '!../admin/src/generated/**'],
      preset: 'client',
      presetConfig: {
        gqlTagName: 'gql',
      },
    },
  },
};

export default config;
