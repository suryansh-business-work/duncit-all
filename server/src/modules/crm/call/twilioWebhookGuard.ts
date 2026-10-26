import type { RequestHandler } from 'express';
import { getRuntimeEnvValue } from '@config/runtimeEnv';
import { logs } from '@observability/log';
import { isValidTwilioSignature, type FormBody } from './twilioSignature';

/**
 * Admits a Twilio webhook only when it carries the `X-Twilio-Signature` Twilio
 * would send for exactly this URL and body, signed with the account's auth
 * token; anything else gets an empty 403 and never reaches the handler.
 *
 * Mount it after the url-encoded body parser — the signature covers the form.
 *
 * The signed URL is rebuilt from `resolveBaseUrl` — the very base the callback
 * URL handed to Twilio was built from — plus the path and query as requested,
 * rather than from the request's own host, which behind the proxy is not what
 * Twilio called. An empty base refuses everything.
 */
export function requireTwilioSignature(route: string, resolveBaseUrl: () => Promise<string>): RequestHandler {
  return async (req, res, next) => {
    const [authToken, rawBase] = await Promise.all([getRuntimeEnvValue('TWILIO_AUTH_TOKEN'), resolveBaseUrl()]);
    const baseUrl = rawBase.trim().replace(/\/$/, '');
    const signature = req.get('X-Twilio-Signature');
    const body: FormBody = req.body ?? {};
    if (baseUrl && isValidTwilioSignature(authToken.trim(), `${baseUrl}${req.originalUrl}`, body, signature)) {
      next();
      return;
    }
    // No body, query or numbers in the log — just why it was refused.
    logs.server.warn('twilio', route, {
      msg: 'Refused an unsigned or wrongly signed Twilio callback',
      has_signature: !!signature,
      configured: !!authToken.trim() && !!baseUrl,
    });
    res.status(403).end();
  };
}
