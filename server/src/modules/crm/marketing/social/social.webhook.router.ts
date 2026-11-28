import express, { type Router } from 'express';
import { logs } from '@observability/log';
import { validHubSignature } from '@utils/hubSignature';
import { metaWebhookKeys } from './social.credentials';
import { processMetaWebhookOutcome } from './social.webhook.process';
import { dispatchDelivery, recordDelivery } from './social.webhook.queue';

/**
 * `/social/webhook` — where Meta delivers Instagram and Page (Messenger)
 * events, set up in Meta for Developers → the app → Webhooks with this URL and
 * the verify token from Settings › Integrations (or registered from Social
 * Accounts › Webhooks). `/social/webhooks/meta`, the address apps were first
 * set up with, answers exactly the same and stays.
 *
 * - GET is Meta's subscription check: echo `hub.challenge` only when
 *   `hub.verify_token` is one we issued.
 * - POST is signed with the app secret (`X-Hub-Signature-256` over the raw
 *   body): anything unsigned or signed with another key is refused before it
 *   is parsed. A good one is stored, answered 200 at once — Meta retries a
 *   slow endpoint and eventually disables it — and processed after, on the
 *   `social-webhook` queue (social.webhook.queue.ts).
 *
 * The Instagram and Facebook entries may be one Meta app or several (a second
 * app for another brand's Pages), so any active app's verify token and secret
 * is accepted.
 */
const BODY_LIMIT = '2mb';
/** The address Meta is told to call, then the one apps were first set up with. */
export const WEBHOOK_PATHS = ['/webhook', '/webhooks/meta'];

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
  router.get(WEBHOOK_PATHS, async (req, res) => {
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

  router.post(WEBHOOK_PATHS, express.raw({ type: 'application/json', limit: BODY_LIMIT }), async (req, res) => {
    const body: unknown = req.body;
    if (!Buffer.isBuffer(body) || !(await signedByMeta(body, req.get('x-hub-signature-256') ?? ''))) {
      logs.server.warn('social-webhook', 'signature', { msg: 'unsigned or wrongly signed webhook delivery refused' });
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
    const deliveryId = await recordDelivery(body.toString('utf8'), payload);
    res.sendStatus(200);
    if (deliveryId) {
      dispatchDelivery(deliveryId);
      return;
    }
    processMetaWebhookOutcome(payload).catch((error: unknown) => logs.server.error('social-webhook', 'process', { error }));
  });
}
