import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: 'src/modules/**/*.schema.ts',
  generates: {
    'src/generated/graphql.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        contextType: '../context#GraphQLContext',
        useIndexSignature: true,
      },
    },
    '../web-ui/app/src/generated/graphql.ts': {
      schema: 'src/modules/**/*.schema.ts',
      documents: '../web-ui/app/src/**/*.graphql',
      plugins: ['typescript', 'typescript-operations', 'typescript-react-apollo'],
    },
    '../web-ui/admin/src/generated/graphql.ts': {
      schema: 'src/modules/**/*.schema.ts',
      documents: '../web-ui/admin/src/**/*.graphql',
      plugins: ['typescript', 'typescript-operations', 'typescript-react-apollo'],
    },
  },
};

export default config;
