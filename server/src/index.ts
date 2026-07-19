import 'dotenv/config';
import './otel'; // OTLP log export to SignOz (gated on OTEL_EXPORTER_OTLP_ENDPOINT)
import { logs, ingestRemoteLog } from './observability/log';
import { buildStatusProbeRouter } from './observability/statusProbe';
import { startStatusScheduler } from './observability/statusScheduler';
import { startPodDraftCleanupScheduler } from '@modules/pods/pod-draft/pod-draft.cleanup';
import { buildHealth } from './observability/health';
import { LANDING_HTML } from './observability/landing';
import http from 'node:http';
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
import { buildShiprocketWebhookRouter } from '@modules/commerce/shiprocket/shiprocket.webhook';
import { buildVenueApiRouter } from '@modules/venues/publicApi/venueApi.router';
import { startNgrokTunnel } from '@config/ngrok';
import { websiteContentService } from '@modules/content/websiteContent/websiteContent.service';
import { userService } from '@modules/access/user/user.service';
import { marketingService } from '@modules/crm/marketing/marketing.service';
import { crmService } from '@modules/crm/crm/crm.service';
import { surveyService } from '@modules/survey/survey.service';

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
  // Fresh databases (e.g. a new staging replica) get the root super admin
  // created on first boot; existing databases no-op.
  await safeSeed('superAdmin', async () => {
    const { userService } = await import('@modules/access/user/user.service');
    await userService.ensureSuperAdmin();
  });
  await safeSeed('settings', () => settingsService.seedDefaults());
  await safeSeed('settingsCaches', () => settingsService.refreshDerivedCaches());
  // Sync the latest mobile app version into the DB from the APP_VERSION env
  // (set by the deploy workflow from app.json) — updates on every push/boot.
  await safeSeed('appVersion', () => settingsService.applyEnvVersion());
  await safeSeed('category', () => categoryService.seedDefaults());
  await safeSeed('vapid', () => notificationService.ensureVapid());
  await safeSeed('policy', () => policyService.seedDefaults());
  await safeSeed('emailTemplates', async () => {
    const { emailTemplateService } = await import('@modules/content/emailTemplate/emailTemplate.service');
    await emailTemplateService.seedDefaults();
  });
  await safeSeed('websiteContent', () => websiteContentService.seedDefaults());
  await safeSeed('websiteNav', async () => {
    const { websiteNavService } = await import('@modules/content/websiteNav/websiteNav.service');
    await websiteNavService.seedDefaults();
  });
  await safeSeed('marketing', () => marketingService.resumeSchedules());
  await safeSeed('venueAutoExtend', async () => {
    const { autoExtendService } = await import('@modules/venues/autoExtend/autoExtend.service');
    await autoExtendService.resumeSchedules();
  });
  await safeSeed('crmServices', () => crmService.seedServiceDefaults());
  await safeSeed('surveyIndexes', () => surveyService.syncIndexes());
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

  // Status-page incidents: seed minimum historical data so the 90-day chart
  // and Incidents feed render (gated to staging / STATUS_SEED_INCIDENTS=1).
  await safeSeed('statusIncidents', async () => {
    const { seedStatusIncidents } = await import('./observability/incident.seed');
    await seedStatusIncidents();
  });

  // Status-page history: probe every monitored service every 5 minutes.
  if (process.env.NODE_ENV !== 'test' && process.env.STATUS_PROBES_DISABLED !== '1') {
    startStatusScheduler();
  }

  // Draft-pod retention: delete drafts past the admin-configured window daily.
  startPodDraftCleanupScheduler();

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
            logs.server.error('graphql', ctx.operationName ?? 'anonymous', {
              code,
              message: err.message,
              path: err.path?.join('.'),
            });
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

  // 70mb covers a base64-inflated 50 MB document upload (50 MB raw ≈ 67 MB base64)
  // so the upload service's size checks are the real gate, not the body parser.
  app.use(
    '/graphql',
    express.json({ limit: '70mb' }),
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

  // ShipRocket shipment-status webhook (parses its own JSON, self-verifies x-api-key).
  app.use('/shiprocket', buildShiprocketWebhookRouter());

  // Public developer REST API — approved venues + slot booking, x-api-key auth
  // (parses its own JSON, carries its own CORS for the Developers portal).
  app.use('/api/v1', buildVenueApiRouter());

  // Branded notice at the API root instead of Express's default "Cannot GET /".
  app.get('/', (_req, res) => res.type('html').send(LANDING_HTML));

  // Rich health report (status, version, uptime, memory, DB check). Always 200
  // while the process is up; powers the Docker healthcheck + the status page.
  app.get('/health', (_req, res) => res.json(buildHealth()));

  // Status-page probe: real HTTP status + TLS cert for the status.duncit.com
  // "Details" dialog (the static page can't read either client-side).
  app.use('/status', buildStatusProbeRouter());

  // Structured log ingest for the frontend apps (@duncit/logs httpTransport).
  // Defensive + always 204; nginx adds CORS for server.duncit.com.
  app.post('/logs', express.json({ limit: '256kb' }), (req, res) => {
    ingestRemoteLog(req.body);
    res.status(204).end();
  });

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
          unread_count = await notificationService.unreadCountForUser(userId);
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
