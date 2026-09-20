import http from 'node:http';
import { extname } from 'node:path';
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { expressMiddleware } from '@as-integrations/express5';
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import { connectDb, dbState } from './config/db';
import { env, isProduction } from './config/env';
import { buildContext, type LiteContext } from './context';
import { resolvers } from './graphql/resolvers';
import { typeDefs } from './graphql/typeDefs';
import { distFile, sendBody, sendStatic, shellHtml } from './html/files';
import { buildMetaTags, injectMeta, jsonLdTag } from './html/meta';
import { headFor } from './html/pages';
import { buildIcsRouter } from './routes/ics';
import { buildUploadRouter } from './routes/upload';
import { startScheduler } from './scheduler';
import { emailService } from './services/email.service';
import { localizationService } from './services/localization.service';
import { settingsService } from './services/settings.service';
import { log } from './utils/log';

/**
 * Duncit Lite's one process: the GraphQL API, the upload and calendar routes,
 * and the HTML server for both hostnames. lite-portal.* (or any host that
 * starts with `portal.`) gets the console shell; every other host gets the
 * web app, with the page's own head written in for crawlers and link previews.
 */
const HTML_TYPE = 'text/html; charset=utf-8';
const NO_CACHE = 'no-cache';
/** Browser origins the API answers: a local dev host, or any duncit.com host. */
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|[a-z0-9-]+\.localhost)(:\d+)?$/;
const DUNCIT_ORIGIN = /^https?:\/\/([a-z0-9-]+\.)?duncit\.com$/;
const isAllowedOrigin = (origin: string | undefined): boolean => !origin || LOCAL_ORIGIN.test(origin) || DUNCIT_ORIGIN.test(origin);

const isPortalHost = (req: Request): boolean => {
  const host = String(req.headers.host ?? '').toLowerCase();
  return host.startsWith('lite-portal.') || host.startsWith('portal.') || host.startsWith('staging.lite-portal.');
};

async function renderWebPage(path: string): Promise<string> {
  const html = shellHtml('index.html');
  try {
    const head = await headFor(path);
    if (!head) return html;
    return injectMeta(html, [buildMetaTags(head.meta), ...head.structured.map(jsonLdTag)].join('\n    '));
  } catch (error) {
    log.warn('html', 'renderWebPage', { error, path });
    return html;
  }
}

async function servePage(req: Request, res: Response): Promise<void> {
  const raw = new URL(req.url ?? '/', 'http://localhost').pathname;
  let path = raw;
  try {
    path = decodeURIComponent(raw);
  } catch {
    path = raw;
  }
  const file = path === '/' || path.endsWith('.html') ? null : distFile(path);
  if (file) {
    sendStatic(req, res, file, path);
    return;
  }
  if (extname(path)) {
    sendBody(req, res, 'Not found', 'text/plain; charset=utf-8', NO_CACHE, 404);
    return;
  }
  if (isPortalHost(req)) {
    sendBody(req, res, shellHtml('portal.html'), HTML_TYPE, NO_CACHE);
    return;
  }
  sendBody(req, res, await renderWebPage(path), HTML_TYPE, NO_CACHE);
}

async function bootstrap(): Promise<void> {
  await connectDb();
  await settingsService.seed();
  await emailService.seedTemplates();
  await localizationService.seed();

  const app = express();
  app.set('trust proxy', true);
  app.disable('x-powered-by');
  app.use(cors({ origin: (origin, cb) => cb(null, isAllowedOrigin(origin)), credentials: true, allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With', 'Apollo-Require-Preflight', 'X-DUID', 'x-duncit-surface', 'x-duncit-app'] }));

  app.get('/health', (_req, res) => {
    res.json({ status: dbState() === 'connected' ? 'ok' : 'degraded', app: 'duncit-lite', env: env.appEnv, db: dbState(), uptime_s: Math.round(process.uptime()), time: new Date().toISOString() });
  });
  app.use(buildUploadRouter());
  app.use(buildIcsRouter());

  const httpServer = http.createServer(app);
  const apollo = new ApolloServer<LiteContext>({
    typeDefs,
    resolvers,
    introspection: !isProduction,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
    formatError: (formatted, error) => {
      const code = (formatted.extensions?.code as string | undefined) ?? 'INTERNAL_SERVER_ERROR';
      if (code === 'INTERNAL_SERVER_ERROR') {
        log.error('graphql', 'error', { error, path: formatted.path });
        return { ...formatted, message: 'Something went wrong on our side. Please try again.' };
      }
      return formatted;
    },
  });
  await apollo.start();
  app.use('/graphql', express.json({ limit: '2mb' }), expressMiddleware(apollo, { context: buildContext }));

  app.get(/.*/, (req, res) => {
    servePage(req, res).catch((error) => {
      log.error('html', 'servePage', { error, url: req.url });
      if (res.headersSent) return;
      // The shell itself may be what failed (a build without dist); answer
      // plainly rather than throwing a second time out of the error path.
      try {
        sendBody(req, res, shellHtml('index.html'), HTML_TYPE, NO_CACHE);
      } catch {
        sendBody(req, res, 'Page unavailable', 'text/plain; charset=utf-8', NO_CACHE, 500);
      }
    });
  });

  startScheduler();
  httpServer.listen(env.port, () => log.info('boot', 'listen', { port: env.port, site: env.siteUrl, portal: env.portalUrl }));
}

bootstrap().catch((error) => {
  log.error('boot', 'fatal', { error });
  process.exit(1);
});
