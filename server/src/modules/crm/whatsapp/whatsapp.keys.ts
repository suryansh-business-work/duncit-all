import { createHmac } from 'node:crypto';

/** OpenWA 0.19+ refuses a production boot when API_MASTER_KEY is shorter than this. */
export const GATEWAY_MASTER_KEY_MIN_LENGTH = 32;
/** HMAC label shared with the deploy workflow's `OPENWA_GATEWAY_MASTER_KEY` step. */
const DERIVE_LABEL = 'duncit-openwa-master-v1';

/** The 64-hex key the deploy hands the gateway when the configured secret is too short. */
export function deriveGatewayMasterKey(secret: string): string {
  return createHmac('sha256', DERIVE_LABEL).update(secret).digest('hex');
}

/**
 * Master keys the gateway may accept, in order: the configured secret (an install
 * seeded before the 32-character floor stored it verbatim), then — only when the
 * secret is short — the derived key a fresh install seeded instead.
 */
export function masterKeyCandidates(): string[] {
  const secret = (process.env.OPENWA_API_MASTER_KEY || '').trim();
  if (!secret) return [];
  return secret.length < GATEWAY_MASTER_KEY_MIN_LENGTH ? [secret, deriveGatewayMasterKey(secret)] : [secret];
}

/** Keys to send as `X-API-Key`, in order: the stored (generated) key, then the master keys. */
export function apiKeyCandidates(storedKey: string | null | undefined): string[] {
  const keys = [(storedKey || '').trim(), ...masterKeyCandidates()].filter(Boolean);
  return [...new Set(keys)];
}
