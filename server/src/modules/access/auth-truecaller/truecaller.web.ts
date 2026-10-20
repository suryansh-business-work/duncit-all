/**
 * The mobile-web handshake.
 *
 * In a browser there is no SDK to hand us a code. The page opens Truecaller
 * with a nonce we minted; when the person taps Continue, Truecaller POSTs a
 * token for their profile to `<server>/truecaller/callback`, keyed by that
 * nonce. The page watches the nonce and, once it is READY, spends it.
 *
 * The callback is public and unauthenticated by Truecaller's design, so it is
 * never trusted on its word: it may only fill in a nonce we minted, still
 * PENDING and unexpired, and the profile is later fetched FROM Truecaller with
 * the token it carried (see `fetchWebProfile`).
 */
import crypto from 'node:crypto';
import express, { Router } from 'express';
import { logs } from '@observability/log';
import { truecallerConfig, truecallerNotConfigured } from './truecaller.config';
import {
  TRUECALLER_REQUEST_TTL_MS,
  TruecallerRequestModel,
  type TruecallerState,
} from './truecaller.model';

/** How Truecaller's web sheet words the action — its own vocabulary. */
const WEB_SUFFIX = { LOGIN: 'login', SIGNUP: 'signup' } as const;
export type TruecallerIntent = keyof typeof WEB_SUFFIX;

export async function startWebRequest(intent: TruecallerIntent, lang: string) {
  const { appKey, partnerName } = await truecallerConfig();
  if (!appKey || !partnerName) throw truecallerNotConfigured();
  const nonce = crypto.randomBytes(24).toString('base64url');
  await TruecallerRequestModel.create({
    key: nonce,
    kind: 'WEB',
    expires_at: new Date(Date.now() + TRUECALLER_REQUEST_TTL_MS),
  });
  const query = new URLSearchParams({
    type: 'btmsheet',
    requestNonce: nonce,
    partnerKey: appKey,
    partnerName,
    lang: /^[a-z]{2}$/.test(lang) ? lang : 'en',
    loginPrefix: 'continue',
    loginSuffix: WEB_SUFFIX[intent],
    ctaPrefix: 'continuewith',
    btnShape: 'round',
    skipOption: 'useanothernum',
  });
  return { request_nonce: nonce, deep_link: `truecallersdk://truesdk/web_verify?${query.toString()}` };
}

/** Where a nonce stands, as the page polling it needs to know. */
export async function webRequestState(nonce: string): Promise<TruecallerState | 'EXPIRED'> {
  const row = await TruecallerRequestModel.findOne({ key: nonce, kind: 'WEB' }).lean();
  if (!row || row.expires_at.getTime() <= Date.now()) return 'EXPIRED';
  return row.state;
}

/**
 * Spend a READY nonce: one conditional write, so a double-tap or a retried
 * request can never spend it twice.
 */
export function claimWebRequest(nonce: string) {
  return TruecallerRequestModel.findOneAndUpdate(
    { key: nonce, kind: 'WEB', state: 'READY', expires_at: { $gt: new Date() } },
    { $set: { state: 'USED' } },
    { new: true }
  )
    .select('+access_token')
    .lean();
}

export function buildTruecallerCallbackRouter(): Router {
  const router = Router();
  router.post('/callback', express.json({ limit: '16kb' }), async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const nonce = typeof body.requestId === 'string' ? body.requestId : '';
    const accessToken = typeof body.accessToken === 'string' ? body.accessToken : '';
    const endpoint = typeof body.endpoint === 'string' ? body.endpoint : '';
    const update = accessToken
      ? { state: 'READY', access_token: accessToken, endpoint }
      : { state: 'REJECTED' };
    try {
      const filled = await TruecallerRequestModel.updateOne(
        { key: nonce, kind: 'WEB', state: 'PENDING', expires_at: { $gt: new Date() } },
        { $set: update }
      );
      if (filled.modifiedCount === 0) {
        logs.server.warn('auth-truecaller', 'callback-unmatched', { has_token: Boolean(accessToken) });
      }
    } catch (error) {
      logs.server.error('auth-truecaller', 'callback-failed', { reason: String(error) });
    }
    // Always 200: the answer is for Truecaller, and it must not tell a prober
    // which nonces exist.
    res.status(200).json({ ok: true });
  });
  return router;
}
