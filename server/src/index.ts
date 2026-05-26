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
import { notificationEvents, type NotifyEvent } from './modules/notification/notification.events';
import jwt from 'jsonwebtoken';
import { policyService } from './modules/policy/policy.service';
import { attachChatSocket } from './modules/chat/chat.socket';
import { websiteContentService } from './modules/websiteContent/websiteContent.service';
import { userService } from './modules/user/user.service';
import { marketingService } from './modules/marketing/marketing.service';

async function safeSeed(name: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    // A single subsystem failing must not crash the whole API. Nginx would
    // otherwise return 502s to every client until the container restarts.
    // eslint-disable-next-line no-console
    console.error(`[bootstrap] ${name} failed:`, err);
  }
}

// Browser-facing origins we trust. Reflects only matching origins back so
// `credentials: true` works (browsers reject `*` with credentials).
const ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
  /^https?:\/\/([a-z0-9-]+\.)?duncit\.com$/,
];

const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return true; // server-to-server, curl, mobile webviews, etc.
  return ALLOWED_ORIGIN_PATTERNS.some((p) => p.test(origin));
};

const corsOptions: cors.CorsOptions = {
  origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: [
    'Authorization',
    'Content-Type',
    'X-Requested-With',
    'Apollo-Require-Preflight',
    'X-Apollo-Operation-Name',
  ],
  maxAge: 600,
  optionsSuccessStatus: 204,
};

async function bootstrap() {
  await connectDB();
  await safeSeed('rbac', () => rbacService.seedDefaults());
  await safeSeed('settings', () => settingsService.seedDefaults());
  await safeSeed('category', () => categoryService.seedDefaults());
  await safeSeed('vapid', () => notificationService.ensureVapid());
  await safeSeed('policy', () => policyService.seedDefaults());
  await safeSeed('websiteContent', () => websiteContentService.seedDefaults());
  await safeSeed('marketing', () => marketingService.resumeSchedules());
  await safeSeed('podPlan', async () => {
    const { podPlanService } = await import('./modules/pod-plan/pod-plan.service');
    await podPlanService.seedDefaults();
  });

  const app = express();
  const httpServer = http.createServer(app);

  // Trust the nginx reverse proxy so req.ip / X-Forwarded-* are honoured.
  app.set('trust proxy', 1);

  const apollo = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });

  await apollo.start();

  // Global CORS — applied before routes so preflight (OPTIONS) for every
  // endpoint (graphql, twilio webhook, SSE, health) gets handled uniformly.
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  app.use(
    '/graphql',
    express.json({ limit: '25mb' }),
    expressMiddleware(apollo, { context: buildContext })
  );

  app.post('/twilio/recordings', express.urlencoded({ extended: false }), async (req, res) => {
    try {
      const rawUrl = String(req.body.RecordingUrl || '');
      const recordingUrl = rawUrl && !/\.(mp3|wav)$/i.test(rawUrl) ? `${rawUrl}.mp3` : rawUrl;
      await userService.attachCallRecording({
        actionId: String(req.query.contactActionId || ''),
        callSid: String(req.body.CallSid || ''),
        recordingSid: String(req.body.RecordingSid || ''),
        recordingUrl,
        durationSeconds: Number(req.body.RecordingDuration || 0),
      });
      res.status(204).end();
    } catch {
      res.status(204).end();
    }
  });

  app.get('/health', (_req, res) => res.json({ ok: true }));

  // Server-Sent Events stream for real-time notifications.
  // EventSource cannot send custom headers, so we accept the JWT via
  // ?token= query string. The connection emits an initial unread count and
  // then a `notify` event whenever the user receives a new notification or
  // marks one as read.
  app.get(
    '/notifications/stream',
    async (req, res) => {
    const token = String(req.query.token || '');
    let userId: string | null = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as {
          id?: string;
        };
        userId = decoded?.id ?? null;
      } catch {
        userId = null;
      }
    }
    if (!userId) {
      res.status(401).end();
      return;
    }

    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders?.();

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const unread = await notificationService.unreadCountForUser(userId);
      send('hello', { unread_count: unread });
    } catch {
      send('hello', { unread_count: 0 });
    }

    const channel = `notify:${userId}`;
    const onEvent = async (payload: NotifyEvent) => {
      let unread_count = payload.unread_count;
      if (unread_count < 0) {
        try {
          unread_count = await notificationService.unreadCountForUser(userId!);
        } catch {
          unread_count = 0;
        }
      }
      send('notify', { ...payload, unread_count });
    };
    notificationEvents.on(channel, onEvent);

    const ping = setInterval(() => {
      res.write(': ping\n\n');
    }, 25000);

    req.on('close', () => {
      clearInterval(ping);
      notificationEvents.off(channel, onEvent);
    });
  }
  );

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
