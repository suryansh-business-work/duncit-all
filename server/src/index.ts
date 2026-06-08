import 'dotenv/config';
import './otel'; // OTLP log export to SignOz (gated on OTEL_EXPORTER_OTLP_ENDPOINT)
import http from 'http';
import cors from 'cors';
import express from 'express';
import { ApolloServer } from '@apollo/server';
import type { ApolloServerPlugin } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { connectDB } from './config/db';
import { typeDefs, resolvers } from './modules';
import { buildContext, GraphQLContext } from './context';
import { rbacService } from '@modules/access/rbac/rbac.service';
import { settingsService } from '@modules/platform/settings/settings.service';
import { portalModeService } from '@modules/platform/portalMode/portalMode.service';
import { categoryService } from '@modules/pods/category/category.service';
import { notificationService } from '@modules/engagement/notification/notification.service';
import { notificationEvents, type NotifyEvent } from '@modules/engagement/notification/notification.events';
import jwt from 'jsonwebtoken';
import { policyService } from '@modules/content/policy/policy.service';
import { initSocketServer } from './realtime/io';
import { attachChatHandlers } from '@modules/engagement/chat/chat.socket';
import { attachBouncerHandlers } from '@modules/support/bouncer/bouncer.socket';
import { attachSupportChatHandlers } from '@modules/support/supportChat/supportChat.socket';
import { attachCallHandlers } from '@modules/crm/call/call.socket';
import { buildCallWebhookRouter } from '@modules/crm/call/call.webhook';
import { startNgrokTunnel } from '@config/ngrok';
import { websiteContentService } from '@modules/content/websiteContent/websiteContent.service';
import { userService } from '@modules/access/user/user.service';
import { marketingService } from '@modules/crm/marketing/marketing.service';
import { crmService } from '@modules/crm/crm/crm.service';

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

async function bootstrap() {
  await connectDB();
  await safeSeed('rbac', () => rbacService.seedDefaults());
  await safeSeed('settings', () => settingsService.seedDefaults());
  await safeSeed('category', () => categoryService.seedDefaults());
  await safeSeed('vapid', () => notificationService.ensureVapid());
  await safeSeed('policy', () => policyService.seedDefaults());
  await safeSeed('websiteContent', () => websiteContentService.seedDefaults());
  await safeSeed('marketing', () => marketingService.resumeSchedules());
  await safeSeed('crmServices', () => crmService.seedServiceDefaults());
  await safeSeed('crmServicesOfferedSlugs', async () => {
    const { serviceOfferedService } = await import('@modules/crm/serviceOffered/serviceOffered.service');
    await serviceOfferedService.backfillSlugs();
  });
  await safeSeed('crmManagedOptions', async () => {
    const { managedOptionService } = await import('@modules/crm/managedOption/managedOption.service');
    await managedOptionService.seedDefaults();
  });
  await safeSeed('podPlan', async () => {
    const { podPlanService } = await import('@modules/pods/pod-plan/pod-plan.service');
    await podPlanService.seedDefaults();
  });

  const app = express();
  const httpServer = http.createServer(app);

  // Trust the nginx reverse proxy so req.ip / X-Forwarded-* are honoured.
  app.set('trust proxy', 1);

  // Surface GraphQL errors (failed queries / INTERNAL_SERVER_ERROR) as ERROR
  // logs. console.error is forwarded to SignOz by ./otel when telemetry is on.
  const graphqlErrorLogger: ApolloServerPlugin<GraphQLContext> = {
    async requestDidStart() {
      return {
        async didEncounterErrors(ctx) {
          for (const err of ctx.errors) {
            const code = (err.extensions?.code as string | undefined) ?? 'GRAPHQL_ERROR';
            // eslint-disable-next-line no-console
            console.error(`[graphql] ${ctx.operationName ?? 'anonymous'} ${code}: ${err.message}`);
          }
        },
      };
    },
  };

  const apollo = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer }), graphqlErrorLogger],
  });

  await apollo.start();

  if (process.env.NODE_ENV !== 'production') {
    app.use(cors({ origin: true, credentials: true }));
    app.options('*', cors({ origin: true, credentials: true }));
  }

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

  // CRM softphone + AI call Twilio webhooks (parses its own urlencoded bodies).
  app.use('/twilio', buildCallWebhookRouter());

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
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as {
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

  // Real-time: socket.io shares the http server with Apollo. One io instance,
  // each feature attaches its own handlers + rooms.
  initSocketServer(httpServer);
  attachChatHandlers();
  attachBouncerHandlers();
  attachSupportChatHandlers();
  attachCallHandlers();

  const port = Number(process.env.PORT || 2001);
  await new Promise<void>((resolve) => httpServer.listen({ port }, resolve));
  // eslint-disable-next-line no-console
  console.log(`🚀 Server ready at http://localhost:${port}/graphql`);

  // Local dev: open a free ngrok tunnel so Twilio can reach the /twilio webhooks.
  if (process.env.NODE_ENV !== 'production') {
    await startNgrokTunnel(port);
  }
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
