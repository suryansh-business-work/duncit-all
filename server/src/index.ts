import 'dotenv/config';
import http from 'http';
import cors from 'cors';
import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { connectDB } from './config/db';
import { typeDefs, resolvers } from './modules';
import { buildContext, GraphQLContext } from './context';
import { rbacService } from './modules/rbac/rbac.service';
import { settingsService } from './modules/settings/settings.service';
import { categoryService } from './modules/category/category.service';
import { notificationService } from './modules/notification/notification.service';
import { attachChatSocket } from './modules/chat/chat.socket';

async function bootstrap() {
  await connectDB();
  await rbacService.seedDefaults();
  await settingsService.seedDefaults();
  await categoryService.seedDefaults();
  await notificationService.ensureVapid();

  const app = express();
  const httpServer = http.createServer(app);

  const apollo = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });

  await apollo.start();

  app.use(
    '/graphql',
    cors<cors.CorsRequest>({ origin: true, credentials: true }),
    express.json({ limit: '5mb' }),
    expressMiddleware(apollo, { context: buildContext })
  );

  app.get('/health', (_req, res) => res.json({ ok: true }));

  // Real-time chat (socket.io) — shares the http server with Apollo.
  attachChatSocket(httpServer);

  const port = Number(process.env.PORT || 2001);
  await new Promise<void>((resolve) => httpServer.listen({ port }, resolve));
  // eslint-disable-next-line no-console
  console.log(`🚀 Server ready at http://localhost:${port}/graphql`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
