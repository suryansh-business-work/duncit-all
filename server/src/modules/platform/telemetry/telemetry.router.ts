import { Router, type Request, type RequestHandler, type Response } from 'express';
import { logs } from '@observability/log';
import { telemetryService } from './telemetry.service';

/**
 * The read-only JSON feeds behind the Tech portal's "Copy GET API" buttons.
 *
 *   GET /telemetry/logs.json?key=…&level=error
 *   GET /telemetry/bugs.json?key=…&status=OPEN
 *
 * There is no login here on purpose: the whole point of the copied URL is that
 * it opens in a browser tab, drops into a monitor, or works from `curl` with
 * nothing else set up. What guards it instead is the key in the query string —
 * an unguessable secret held in Telemetry Settings, checked in constant time,
 * and rotatable from that page the moment a URL leaves safe hands.
 *
 * That trade is worth naming plainly, because what is behind it is not a
 * status counter: these rows carry stack traces, URLs, addresses, emails and
 * phone numbers. Anyone holding the key holds all of it. It is a password
 * wearing a URL's clothes — treat every copied link as one.
 */

// CORS is deliberately absent: nginx sets (and `proxy_hide_header`s over) the
// API's own CORS headers in production, and the dev `cors()` middleware does it
// locally — a third opinion here would only be the one that loses.
const NO_STORE = {
  'Cache-Control': 'no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow',
} as const;

/** One query-string value, or undefined when it was absent or repeated oddly. */
function param(req: Request, name: string): string | undefined {
  const raw = req.query[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

function numberParam(req: Request, name: string): number | undefined {
  const raw = param(req, name);
  if (raw === undefined) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Pretty-printed rather than compact: the first reader of one of these URLs is
 * a person who pasted it into a browser tab, and a single 200 KB line is
 * unreadable there. Machines do not care either way.
 */
function sendJson(res: Response, body: unknown): void {
  res.set(NO_STORE).type('application/json').send(`${JSON.stringify(body, null, 2)}\n`);
}

/**
 * The key, from the query string or the `x-telemetry-key` header.
 *
 * The header exists because a query string is the one part of a URL that
 * everything writes down — nginx's access log, a proxy, a browser history, a
 * pasted screenshot. A URL still works, because the button has to hand out
 * something that opens in a tab; a script should send the header instead.
 */
function feedKey(req: Request): string {
  const header = req.headers['x-telemetry-key'];
  const fromHeader = Array.isArray(header) ? header[0] : header;
  if (typeof fromHeader === 'string' && fromHeader.trim() !== '') return fromHeader.trim();
  return param(req, 'key') ?? '';
}

/** The key check both routes start with. Returns false once it has answered. */
async function keyRejected(req: Request, res: Response): Promise<boolean> {
  if (await telemetryService.publicKeyMatches(feedKey(req))) return false;
  res.status(401);
  sendJson(res, {
    error: 'UNAUTHORIZED',
    message:
      'This feed needs the telemetry key. Copy a fresh URL from Tech → Telemetry, or rotate the key if this one was retired.',
  });
  return true;
}

/**
 * Answer, or say why not — but never reject.
 *
 * Express 4 does not adopt a promise returned from a handler, and this process
 * registers no `unhandledRejection` listener, so a bare async route turns any
 * transient database error into a dead API container for every portal, mWeb and
 * the app. That is not a price a public, unauthenticated GET is allowed to
 * charge, so every await in here lands inside this wrapper. Mirrors the
 * try/catch every other router in the codebase already carries.
 */
function guard(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res) => {
    handler(req, res).catch((error: unknown) => {
      logs.server.error('telemetry', 'publicFeed', { error, path: req.path });
      if (res.headersSent) return;
      res.status(500);
      sendJson(res, { error: 'INTERNAL', message: 'The feed could not be read. Try again.' });
    });
  };
}

export function buildTelemetryFeedRouter() {
  const router = Router();

  router.get(
    '/logs.json',
    guard(async (req, res) => {
      if (await keyRejected(req, res)) return;
      const level = param(req, 'level');
      const requested = numberParam(req, 'limit');
      const rows = await telemetryService.publicLogsFeed({
        level,
        environment: param(req, 'environment'),
        source: param(req, 'source'),
        user_id: param(req, 'user_id'),
        session_id: param(req, 'session_id'),
        ip: param(req, 'ip'),
        since_hours: numberParam(req, 'since_hours'),
        limit: requested,
      });
      sendJson(res, {
        generated_at: new Date().toISOString(),
        level: level ?? 'all',
        count: rows.length,
        // Newest-first with a ceiling, so a full page is very likely a cut one.
        // Saying so beats a reader assuming a quiet week.
        limit: telemetryService.logFeedLimit(requested),
        truncated: rows.length >= telemetryService.logFeedLimit(requested),
        logs: rows,
      });
    }),
  );

  router.get(
    '/bugs.json',
    guard(async (req, res) => {
      if (await keyRejected(req, res)) return;
      const requested = numberParam(req, 'limit');
      const bugs = await telemetryService.publicBugsFeed({
        status: param(req, 'status'),
        source: param(req, 'source'),
        limit: requested,
      });
      sendJson(res, {
        generated_at: new Date().toISOString(),
        count: bugs.length,
        limit: telemetryService.bugFeedLimit(requested),
        truncated: bugs.length >= telemetryService.bugFeedLimit(requested),
        bugs,
      });
    }),
  );

  return router;
}
