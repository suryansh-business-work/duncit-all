/**
 * Builds the GraphQL schema the way the server does at boot. A malformed SDL
 * block — an unterminated description, a type that names one that does not
 * exist — passes `tsc` happily and only fails when the process starts, so this
 * makes that failure cheap to find.
 *
 * Run: npx ts-node -r tsconfig-paths/register --transpile-only scripts/check-schema.ts
 */
import { ApolloServer } from '@apollo/server';
import { typeDefs, resolvers } from '../src/modules';

const server = new ApolloServer({ typeDefs, resolvers });

server
  .start()
  .then(async () => {
    console.log('schema builds');
    await server.stop();
  })
  .catch((error: unknown) => {
    console.error('schema FAILED to build');
    console.error(error);
    process.exit(1);
  });
