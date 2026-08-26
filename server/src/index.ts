import 'dotenv/config';
import './otel'; // OTLP log export to SignOz (gated on OTEL_EXPORTER_OTLP_ENDPOINT)
import { logs, ingestRemoteLog } from './observability/log';
import {
  identityFromRequest,
  requestIdentityMiddleware,
} from './observability/requestIdentity';
import { buildStatusProbeRouter } from './observability/statusProbe';
import { buildUploadRouter } from './routes/upload.router';
import { startStatusScheduler } from './observability/statusScheduler';
import { startPodDraftCleanupScheduler } from '@modules/pods/pod-draft/pod-draft.cleanup';
import { startAutoPodSweepScheduler } from '@modules/pods/autoPod/autoPod.recovery';
import { startPodAutoCancelScheduler } from '@modules/pods/pod/pod.autoCancel';
import { startTelemetryCleanupScheduler } from './observability/telemetryScheduler';
import { startMailAutomationScheduler } from '@modules/platform/mailAutomation/mailAutomation.poller';
import { startPaymentReconciler } from '@modules/finance/payment/payment.reconciler';
import { startWhatsappScheduler } from '@modules/platform/whatsapp/whatsapp.scheduler';
import { startDbBackupScheduler } from '@modules/platform/dbBackup/dbBackup.scheduler';
import { startAccountDeletionScheduler } from '@modules/access/accountDeletion/accountDeletion.scheduler';
import { startAccountLockRefresh } from '@modules/access/accountDeletion/accountDeletion.lock';
import { buildDbBackupRouter } from '@modules/platform/dbBackup/dbBackup.router';
import { buildGmailOAuthRouter } from '@modules/platform/mailAutomation/mailAutomation.router';
import { graphqlErrorLevel } from './observability/graphqlErrorLevel';
import { buildHealth } from './observability/health';
import { LANDING_HTML } from './observability/landing';
import http from 'node:http';
import cors from 'cors';
import express from 'express';
import { ApolloServer } from '@apollo/server';
import type { ApolloServerPlugin } from '@apollo/server';
import { unwrapResolverError } from '@apollo/server/errors';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { describeFetchFailure, humanFetchMessage } from '@utils/outboundFetch';
import { connectDB } from './config/db';
import { initRedis } from './config/redis';
import { redisResponseCachePlugin } from './config/redisResponseCache';
import { typeDefs, resolvers } from './modules';
import { buildContext, GraphQLContext } from './context';
import {
  surfaceFromOrigin,
  withEmailSource,
} from '@modules/content/emailLog/emailLog.service';
import { rbacService } from '@modules/access/role/rbac.service';
import { settingsService } from '@modules/platform/settings/settings.service';
import { telemetryService } from '@modules/platform/telemetry/telemetry.service';
import { buildTelemetryFeedRouter } from '@modules/platform/telemetry/telemetry.router';
import { buildAiPromptFeedRouter } from '@modules/ai/prompt/prompt.router';
import { categoryService } from '@modules/pods/category/category.service';
import { notificationService } from '@modules/engagement/notification/notification.service';
import { notificationEvents, type NotifyEvent } from '@modules/engagement/notification/notification.events';
import jwt from 'jsonwebtoken';
import { policyService } from '@modules/content/policy/policy.service';
import { initSocketServer } from './realtime/io';
import { attachChatHandlers } from '@modules/engagement/chat/chat.socket';
import { attachStaffChatHandlers } from '@modules/engagement/staffChat/staffChat.socket';
import { attachBouncerHandlers } from '@modules/support/bouncer/bouncer.socket';
import { attachSupportChatHandlers } from '@modules/support/supportChat/supportChat.socket';
import { attachCallHandlers } from '@modules/crm/call/call.socket';
import { buildCallWebhookRouter } from '@modules/crm/call/call.webhook';
import { buildShiprocketWebhookRouter } from '@modules/commerce/shiprocket/shiprocket.webhook';
import { buildVenueApiRouter } from '@modules/venues/publicApi/venueApi.router';
import { buildCampaignTrackingRouter } from '@modules/crm/marketing/tracking.router';
import { buildShortLinkRouter } from '@modules/crm/marketing/shortLink.router';
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
    logs.server.error('bootstrap', 'safeSeed', { error: err, name, msg: `${name} failed` });
  }
}

async function bootstrap() {
  await connectDB();
  // Redis response cache (gated on REDIS_URL — a no-op without it, so local
  // dev and tests run cache-less). `?noRedis=true` on any portal/mWeb URL
  // bypasses it per request via the x-no-redis header.
  initRedis();
  await safeSeed('rbac', () => rbacService.seedDefaults());
  // Fresh databases (e.g. a new staging replica) get the root super admin
  // created on first boot; existing databases no-op.
  await safeSeed('superAdmin', async () => {
    const { userService } = await import('@modules/access/user/user.service');
    await userService.ensureSuperAdmin();
  });
  // Data migration: collapse legacy pod_type values (NATIVE_* / NON_NATIVE_*)
  // to FREE/PAID before traffic is served — the GraphQL enum no longer
  // carries the legacy values, so unmigrated docs would fail to resolve.
  //
  // EXPLICITLY GATED, never implicit. An earlier version ran unconditionally on
  // every boot, and a local `pnpm dev` with .env pointing at the live cluster
  // rewrote production data that the DEPLOYED enum could not represent — a
  // production outage from a dev-machine boot. Data migrations only run when
  // the environment says so; deploy.yml sets this for the release that ships
  // the new enum, local dev never does.
  if (process.env.RUN_POD_TYPE_MIGRATION === '1') {
    await safeSeed('podTypeMigration', async () => {
      const { migrateLegacyPodTypes } = await import('@modules/pods/pod/pod-type.migration');
      await migrateLegacyPodTypes();
    });
  }
  /*
    Give the Club Admins who predate the onboarding record one.

    Gated like the pod-type migration above, and for the same reason: it is a
    one-off for the release that ships it, not a rule. Ungated it would run on
    every boot and quietly recreate a record an operator had deliberately hard-
    deleted, because deleting the record does not revoke the role.

    It exists at all because the backfill was a mutation somebody had to
    remember to call — and nobody did, so the Onboarded Club Admins table sat
    empty in production with three admins in the database.
  */
  if (process.env.RUN_CLUB_ADMIN_BACKFILL === '1') {
    await safeSeed('clubAdminBackfill', async () => {
      const { clubAdminProfileService } = await import(
        '@modules/clubs/clubAdminProfile/clubAdminProfile.service'
      );
      const result = await clubAdminProfileService.backfill();
      logs.server.info('bootstrap', 'clubAdminBackfill', result);
    });
  }

  /*
    Give an id to every legal record written before that id existed.

    Contracts are new, so there it repairs nothing on most databases. Documents
    and policies are not: each one already in the collection predates its id and
    would otherwise show a dash forever where its permanent handle belongs. All
    three are idempotent and cheap — they only look for the missing.
  */
  await safeSeed('legalEntityIds', async () => {
    const [{ contractService }, { legalDocumentService }, { policyService }, { grievanceService }] =
      await Promise.all([
        import('@modules/content/contract/contract.service'),
        import('@modules/content/legalDocument/legalDocument.service'),
        import('@modules/content/policy/policy.service'),
        import('@modules/content/grievance/grievance.service'),
      ]);
    const contracts = await contractService.backfillIds();
    const documents = await legalDocumentService.backfillIds();
    const policies = await policyService.backfillIds();
    const grievances = await grievanceService.backfillIds();
    const repaired =
      contracts.repaired + documents.repaired + policies.repaired + grievances.repaired;
    if (repaired > 0) {
      logs.server.info('bootstrap', 'legalEntityIds', {
        contracts,
        documents,
        policies,
        grievances,
      });
    }
  });
  await safeSeed('settings', () => settingsService.seedDefaults());
  await safeSeed('settingsCaches', () => settingsService.refreshDerivedCaches());
  // Telemetry: seed the singleton, prime the log-funnel runtime flags, then wire
  // the DB-persist handler so selected-level logs start recording.
  await safeSeed('telemetry', () => telemetryService.seedDefaults());
  telemetryService.enableIngestion();
  // Sync the latest mobile app version into the DB from the APP_VERSION env
  // (set by the deploy workflow from app.json) — updates on every push/boot.
  await safeSeed('appVersion', () => settingsService.applyEnvVersion());
  await safeSeed('category', () => categoryService.seedDefaults());
  await safeSeed('vapid', () => notificationService.ensureVapid());
  await safeSeed('policy', () => policyService.seedDefaults());
  // Stamp the signup-acceptance flag onto policies written before it existed,
  // so the admin console filters the same set the signup gate actually asks for.
  await safeSeed('policySignupFlag', async () => {
    const { repaired } = await policyService.backfillSignupAcceptance();
    if (repaired > 0) {
      logs.server.info('bootstrap', 'policySignupFlag', { repaired });
    }
  });
  // Every key the platform ships copy for, into Admin > Localization.
  // This used to happen only when somebody opened that page and pressed
  // "Import app keys", so a fresh environment — or any key added since the
  // last time anyone pressed it — sat untranslatable. Create-only: an
  // existing row keeps its translations.
  await safeSeed('localization', async () => {
    const { localizationService } = await import('@modules/platform/localization/localization.service');
    const created = await localizationService.seedDefaults();
    if (created > 0) logs.server.info('bootstrap', 'localization', { created });
  });
  // Every AI feature reads its system prompt from the AI portal's Prompt
  // Library; this puts the shipped defaults there on first boot.
  await safeSeed('aiPrompts', async () => {
    const { aiPromptService } = await import('@modules/ai/prompt/prompt.service');
    await aiPromptService.seedDefaults();
  });
  // The OpenAI rate card. Every usage row is priced when it is written, so a
  // missing rate is not repairable later — seed it before anything can call out.
  await safeSeed('openAiPrices', async () => {
    const { openAiUsageService } = await import('@modules/ai/openaiUsage/openaiUsage.service');
    await openAiUsageService.seedDefaults();
  });
  await safeSeed('emailTemplates', async () => {
    const { emailTemplateService } = await import('@modules/content/emailTemplate/emailTemplate.service');
    // Fragments first: a template imported on this same boot may already name
    // one, and a missing fragment would render it unwrapped.
    const { emailFragmentService } = await import(
      '@modules/content/emailFragment/emailFragment.service'
    );
    await emailFragmentService.seedDefaults();
    await emailTemplateService.seedDefaults();
  });
  await safeSeed('websiteContent', () => websiteContentService.seedDefaults());
  await safeSeed('websiteNav', async () => {
    const { websiteNavService } = await import('@modules/content/websiteNav/websiteNav.service');
    await websiteNavService.seedDefaults();
  });
  await safeSeed('marketing', () => marketingService.resumeSchedules());
  await safeSeed('waCampaigns', async () => {
    const { waCampaignService } = await import('@modules/crm/marketing/waCampaign.service');
    await waCampaignService.resumeSchedules();
  });
  await safeSeed('venueAutoExtend', async () => {
    const { autoExtendService } = await import('@modules/venues/autoExtend/autoExtend.service');
    await autoExtendService.resumeSchedules();
  });
  await safeSeed('crmServices', () => crmService.seedServiceDefaults());
  await safeSeed('surveyIndexes', () => surveyService.syncIndexes());
  // Drops the superseded single-field referral guard on the coin ledger so one
  // referral can pay both the referrer and the member they brought in.
  await safeSeed('coinIndexes', async () => {
    const { coinService } = await import('@modules/finance/coin/coin.service');
    await coinService.syncIndexes();
  });
  // Carries the earn rate off AppSettings and the referral amount off
  // ReferralSettings into the one document that now owns both. Skipping this
  // step resets a configured platform back to the shipped defaults.
  await safeSeed('coinSettings', async () => {
    const { coinSettingsService } = await import('@modules/finance/coin/coin.settings.service');
    await coinSettingsService.seed();
  });
  // Stamps a deletion date on requests filed before the retention window
  // existed. Skipping it leaves those rows with no date to count down from, so
  // the Tech queue shows a blank where the member's promise should be.
  await safeSeed('accountDeletionDates', async () => {
    const { accountDeletionService } = await import(
      '@modules/access/accountDeletion/accountDeletion.service'
    );
    await accountDeletionService.backfillScheduledDates();
  });
  /*
    Which accounts are sealed because their owner asked to be deleted.

    Held in memory and read on EVERY authenticated request, so it must be
    populated before the server accepts one — Duncit JWTs never expire, and an
    empty map is a map that lets every revoked token back in. This runs here,
    before `app.listen`, for exactly that reason.
  */
  await safeSeed('accountDeletionLocks', async () => {
    const { loadAccountLocks } = await import(
      '@modules/access/accountDeletion/accountDeletion.lock'
    );
    await loadAccountLocks();
  });
  // Builds the gift card unique indexes (code, payment_id, the once-only
  // redeem guard) — new unique indexes only land through syncIndexes at boot.
  await safeSeed('giftCardIndexes', async () => {
    const { giftcardService } = await import('@modules/finance/giftcard/giftcard.service');
    await giftcardService.syncIndexes();
  });
  // Builds the share-key unique index that makes an automatically minted share
  // link one per thing shared. Without it two people sharing the same pod at
  // the same moment each get their own link, and neither carries the pod's
  // real click count. New unique indexes only land through syncIndexes.
  await safeSeed('shortLinkIndexes', async () => {
    const { ShortLinkModel } = await import('@modules/crm/marketing/shortLink.model');
    await ShortLinkModel.syncIndexes();
  });
  // Builds the WhatsApp send log's unique index. It IS the idempotency: without
  // it every re-trigger of a domain event is a second billed message, and the
  // index only lands on an already-deployed database through syncIndexes.
  await safeSeed('waMessageLogIndexes', async () => {
    const { WaMessageLogModel } = await import('@modules/platform/whatsapp/waMessageLog.model');
    await WaMessageLogModel.syncIndexes();
  });
  // Creates the gift card sales policy singleton (amount presets, validity) so
  // the buy page has amounts on day one.
  await safeSeed('giftCardSettings', async () => {
    const { giftCardSettingsService } = await import(
      '@modules/finance/giftcard/giftcard.settings.service'
    );
    await giftCardSettingsService.seed();
  });
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
  // Membership tiers + the comparison rows the apps render. $setOnInsert only,
  // so a catalogue Admin has edited survives every redeploy.
  await safeSeed('membership', async () => {
    const { membershipService } = await import(
      '@modules/engagement/membership/membership.service'
    );
    await membershipService.seedDefaults();
  });

  // The shipped badge catalogue (Legend, Pack Champion, the partner badges …).
  // $setOnInsert only, so an admin's edits to a badge survive every redeploy.
  await safeSeed('badges', async () => {
    const { badgeService } = await import('@modules/engagement/badge/badge.service');
    await badgeService.seedDefaults();
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

  // Auto Pods: expire offers whose slot date passed, recover stuck materializations.
  startAutoPodSweepScheduler();

  // Pod auto-cancel: inside the admin-configured lead window, cancel pods whose
  // settlement would leave the host side negative, refunding attendees under
  // each venue's cancellation policy. Off until an admin enables it.
  startPodAutoCancelScheduler();

  // Telemetry retention: delete persisted logs/bugs past the admin window daily.
  startTelemetryCleanupScheduler();

  // Mail automation: read each connected Gmail mailbox forward from its cursor,
  // open a ticket for every new conversation and acknowledge it once.
  startMailAutomationScheduler();

  // Payments: adopt captures Razorpay took while the client was gone, and
  // re-run finalization side effects that failed the first time round.
  startPaymentReconciler();

  // Database backups: a one-minute tick that takes the archive when the
  // admin-configured window has passed (Tech > Database > Backups; off until
  // an operator turns it on) and prunes past the keep-last count.
  startDbBackupScheduler();

  // Account deletions: a one-minute tick that carries out requests whose grace
  // period has run out (Admin Panel > Settings > Account deletion; off until an
  // operator turns it on), plus the safety-net refresh of the seal map above.
  startAccountDeletionScheduler();
  startAccountLockRefresh();

  // WhatsApp: the scenarios no domain event can fire — the pod reminder, the
  // nudge to complete a finished pod, an unanswered slot request, a released
  // seat nobody took, and the four feedback asks once a pod has ended. Runs on
  // a single replica only; see the note at the top of whatsapp.scheduler.ts.
  startWhatsappScheduler();

  const app = express();
  const httpServer = http.createServer(app);

  /*
    Socket timeouts, set explicitly because Node's defaults are wrong behind a
    reverse proxy. Node drops an idle keep-alive socket after 5s while nginx
    keeps its upstream connection open far longer, so nginx regularly writes a
    request onto a socket Node has just decided to close — which surfaces to the
    client as an intermittent 502 / "socket hang up" that no application code
    explains. Each value below is chosen relative to deploy/nginx/duncit.com.
  */
  // Longer than nginx's upstream keepalive, so Node is never the side that
  // closes an idle connection first and nginx never races that close.
  httpServer.keepAliveTimeout = 65_000;
  // Node requires this to exceed keepAliveTimeout; otherwise a socket reused
  // right at the boundary is torn down mid-headers.
  httpServer.headersTimeout = 66_000;
  // Pinned to the LONGEST proxy_read_timeout in front of us, which is the
  // /upload block's 900s — requestTimeout is per-server and cannot be raised for
  // one route. It measures time-to-receive the whole request, and /upload is the
  // only route where that is a real duration: a 60–150 MB build artifact streams
  // in with proxy_request_buffering off, so the clock runs while the CI runner
  // uploads. Everything else is shielded by nginx buffering the request body
  // before Node sees a byte, so the longer window is not slow-loris exposure.
  httpServer.requestTimeout = 900_000;

  // Trust the nginx reverse proxy so req.ip / X-Forwarded-* are honoured.
  app.set('trust proxy', 1);

  // Carry the caller (verified account, address, user agent, device id) through
  // the whole request, so every `logs.server.*` written while handling it is
  // attributed without four hundred call sites having to pass it along.
  // Mounted before every route, including /graphql — read `trust proxy` above
  // first: req.ip is only the real client because of it.
  app.use(requestIdentityMiddleware);

  // Surface GraphQL errors as logs. console.error is forwarded to SignOz by
  // ./otel when telemetry is on. The LEVEL is not uniform: a refusal the caller
  // has to fix (not signed in, no billing address, wrong portal) is a warn, and
  // only a genuine server/gateway fault is an error — see graphqlErrorLevel.
  const graphqlErrorLogger: ApolloServerPlugin<GraphQLContext> = {
    async requestDidStart() {
      return {
        async didEncounterErrors(ctx) {
          for (const err of ctx.errors) {
            const code = (err.extensions?.code as string | undefined) ?? 'GRAPHQL_ERROR';
            // A bare "fetch failed" is undebuggable — log the undici cause too.
            const cause = describeFetchFailure(unwrapResolverError(err));
            logs.server[graphqlErrorLevel(code)]('graphql', ctx.operationName ?? 'anonymous', {
              // The failure itself, not only its text. A Bug takes its title and
              // its fingerprint from `error`, and falls back to the COMPONENT
              // when a record carries none — which named every GraphQL bug after
              // the operation that tripped it ("Error: MobilePexelsSearch") and
              // filed one such row per operation instead of one per fault.
              error: err,
              code,
              message: cause ? `${err.message} (${cause})` : err.message,
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
    // Node's fetch reports every outbound transport failure as the same bare
    // "fetch failed" and hides the reason (DNS, refused, TLS, timeout) in
    // error.cause. Any resolver that lets one escape would hand clients those
    // two words — rewrite it with the actual reason instead.
    formatError(formatted, error) {
      const unwrapped = unwrapResolverError(error);
      const detail = describeFetchFailure(unwrapped);
      if (!detail) return formatted;
      // The reason in words for the person who pressed the button; the undici
      // code kept in `reason` for the log and the Tech portal's Error Logs.
      // `outboundFetch` already does this for calls that name their service —
      // this catches the ones that still fetch bare.
      const message = humanFetchMessage('That service', unwrapped) ?? `Upstream request failed (${detail})`;
      return {
        ...formatted,
        message,
        extensions: { ...formatted.extensions, code: 'BAD_GATEWAY', reason: detail },
      };
    },
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      graphqlErrorLogger,
      redisResponseCachePlugin,
    ],
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
    // Every email sent while handling this request is attributed to the surface
    // that made it — native, mWeb, a website, a portal — read from the Origin
    // the browser already sends. Threading a `source` argument through forty
    // send sites would be forty chances to forget it, and a background job has
    // no request to thread it from; anything outside a request is SERVER, which
    // is exactly what it is.
    (req, _res, next) => {
      withEmailSource(surfaceFromOrigin(req.headers.origin), next);
    },
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

  // Google's OAuth redirect after an operator connects a Gmail mailbox in the
  // Tech portal. A browser navigation, so it lives here and not in GraphQL.
  app.use('/gmail', buildGmailOAuthRouter());

  // Public developer REST API — approved venues + slot booking, x-api-key auth
  // (parses its own JSON, carries its own CORS for the Developers portal).
  app.use('/api/v1', buildVenueApiRouter());

  // Marketing-campaign open pixel + tracked link redirects. Hit by mail
  // clients, so: public, no CORS, and never an error page.
  app.use('/t', buildCampaignTrackingRouter());

  // Short links. nginx rewrites duncit.com/<code> to /r/<code> here — see
  // deploy/nginx/duncit.com for the apex carve-out this depends on.
  app.use('/r', buildShortLinkRouter());

  // Read-only telemetry JSON feeds (Tech portal's "Copy GET API"). No login by
  // design — the key in the query string is the whole gate, so treat a copied
  // URL as the password it is. See telemetry.router.ts.
  app.use('/telemetry', buildTelemetryFeedRouter());

  // The AI Library's read-only JSON feed (the AI portal's "Copy GET API").
  // Deliberately open: no login and no key. It publishes the platform's own
  // prompts, code ones included 2014 see prompt.router.ts for what that costs.
  app.use('/ai-prompts', buildAiPromptFeedRouter());

  // Branded notice at the API root instead of Express's default "Cannot GET /".
  app.get('/', (_req, res) => res.type('html').send(LANDING_HTML));

  // Rich health report (status, version, uptime, memory, DB check). Always 200
  // while the process is up; powers the Docker healthcheck + the status page.
  app.get('/health', (_req, res) => res.json(buildHealth()));

  // Status-page probe: real HTTP status + TLS cert for the status.duncit.com
  // "Details" dialog (the static page can't read either client-side).
  // Browser uploads land here and go on to ImageKit on the private key — no
  // signature, because a browser cannot make one and the signed-from-the-browser
  // scheme fails outright when the two keys are not a pair.
  app.use('/upload', buildUploadRouter());

  // Database backup archives. Unlike /app-builds there is no nginx location for
  // these — an archive is the whole database in one file, so the only way out
  // is this route, behind a signed link that names one backup and lives for
  // minutes. See dbBackup.router.ts.
  app.use('/db-backups', buildDbBackupRouter());

  app.use('/status', buildStatusProbeRouter());

  // Structured log ingest for the frontend apps (@duncit/logs httpTransport).
  // Defensive + always 204; nginx adds CORS for server.duncit.com.
  //
  // The account, address and user agent come from `identityFromRequest`, never
  // from the body — the route is public, so a body could name anyone.
  app.post('/logs', express.json({ limit: '256kb' }), (req, res) => {
    ingestRemoteLog(req.body, identityFromRequest(req));
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
  attachStaffChatHandlers();
  attachBouncerHandlers();
  attachSupportChatHandlers();
  attachCallHandlers();

  const port = Number(process.env.PORT || 2001);
  await new Promise<void>((resolve) => httpServer.listen({ port }, resolve));
  logs.server.info('bootstrap', 'listen', {
    msg: 'Server ready',
    url: `http://localhost:${port}/graphql`,
  });

  // Local dev: open a free ngrok tunnel so Twilio can reach the /twilio webhooks.
  if (process.env.NODE_ENV !== 'production') {
    await startNgrokTunnel(port);
  }
}

bootstrap().catch((err) => {
  logs.server.error('bootstrap', 'main', { error: err, msg: 'Fatal bootstrap error' });
  process.exit(1);
});
