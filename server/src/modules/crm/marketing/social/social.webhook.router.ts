import express, { type Router } from 'express';
import { logs } from '@observability/log';
import { validHubSignature } from '@utils/hubSignature';
import { metaWebhookKeys } from './social.credentials';
import { processMetaWebhook } from './social.webhook.process';

/**
 * `/social/webhooks/meta` — where Meta delivers Instagram and Page (Messenger)
 * events, set up in Meta for Developers → the app → Webhooks with this URL and
 * the verify token from Settings › Integrations.
 *
 * - GET is Meta's subscription check: echo `hub.challenge` only when
 *   `hub.verify_token` is one we issued.
 * - POST is signed with the app secret (`X-Hub-Signature-256` over the raw
 *   body): anything unsigned or signed with another key is refused before it
 *   is parsed. A good one is answered 200 at once — Meta retries a slow
 *   endpoint and eventually disables it — and processed after.
 *
 * The Instagram and Facebook entries may be one Meta app or several (a second
 * app for another brand's Pages), so any active app's verify token and secret
 * is accepted.
 */
const BODY_LIMIT = '2mb';

async function verifyTokens(): Promise<string[]> {
  return (await metaWebhookKeys()).verifyTokens;
}

async function appSecrets(): Promise<string[]> {
  return [...new Set((await metaWebhookKeys()).secrets)];
}

/** Whether the raw body was signed by one of our Meta apps. */
export async function signedByMeta(body: Buffer, header: string): Promise<boolean> {
  return (await appSecrets()).some((secret) => validHubSignature(secret, body, header));
}

export function mountMetaWebhook(router: Router): void {
  router.get('/webhooks/meta', async (req, res) => {
    const mode = typeof req.query['hub.mode'] === 'string' ? req.query['hub.mode'] : '';
    const token = typeof req.query['hub.verify_token'] === 'string' ? req.query['hub.verify_token'] : '';
    const challenge = typeof req.query['hub.challenge'] === 'string' ? req.query['hub.challenge'] : '';
    const tokens = await verifyTokens();
    if (mode === 'subscribe' && token && tokens.includes(token)) {
      res.type('text/plain').send(challenge);
      return;
    }
    logs.server.warn('social-webhook', 'verify', { msg: 'Meta webhook verification refused', mode });
    res.sendStatus(403);
  });

  router.post('/webhooks/meta', express.raw({ type: 'application/json', limit: BODY_LIMIT }), async (req, res) => {
    const body: unknown = req.body;
    if (!Buffer.isBuffer(body) || !(await signedByMeta(body, req.get('x-hub-signature-256') ?? ''))) {
      res.sendStatus(401);
      return;
    }
    let payload: unknown;
    try {
      payload = JSON.parse(body.toString('utf8'));
    } catch {
      res.sendStatus(400);
      return;
    }
    res.sendStatus(200);
    processMetaWebhook(payload).catch((error: unknown) => logs.server.error('social-webhook', 'process', { error }));
  });
}
