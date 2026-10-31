import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';
import { logs } from '@observability/log';
import { SocialAccountModel } from './social.model';

/**
 * Social tokens at rest.
 *
 * An access token is a credential for somebody else's account: a database
 * dump, a backup or a stray `select('+access_token')` must not hand it out in
 * the clear. Every token is sealed with AES-256-GCM before it is written and
 * opened only in the one place a reader needs it (social.sync's handleOf).
 *
 * The key is SOCIAL_TOKEN_KEY (32 bytes, base64 or hex). Without it the key is
 * DERIVED from JWT_SECRET with HKDF, so a stack that was never given its own
 * key still seals — but a token sealed on one stack cannot be opened on a stack
 * with a different JWT secret, which is why the derivation is only a fallback
 * and is warned about once.
 *
 * Stored form: `enc:v1:<iv>:<tag>:<ciphertext>` (base64 parts). A value without
 * the prefix is a legacy plaintext token and is handed back as-is, so nothing
 * breaks between the deploy and the boot-time pass that seals what is left.
 */
const PREFIX = 'enc:';
const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const IV_BYTES = 12;
const HKDF_SALT = 'duncit-social-tokens';
const HKDF_INFO = 'v1';

let cachedKey: Buffer | null = null;
let warnedDerived = false;

/** A 32-byte key from its base64 or hex spelling; null when it is neither. */
function decodeKey(raw: string): Buffer | null {
  const trimmed = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) return Buffer.from(trimmed, 'hex');
  const fromBase64 = Buffer.from(trimmed, 'base64');
  return fromBase64.length === KEY_BYTES ? fromBase64 : null;
}

function resolveKey(): Buffer {
  if (cachedKey) return cachedKey;
  const configured = process.env.SOCIAL_TOKEN_KEY ?? '';
  if (configured.trim()) {
    const key = decodeKey(configured);
    if (!key) throw new Error('SOCIAL_TOKEN_KEY must be 32 bytes, written as base64 or hex');
    cachedKey = key;
    return key;
  }
  const secret = process.env.JWT_SECRET ?? '';
  if (!secret) {
    throw new Error('Social tokens cannot be sealed: set SOCIAL_TOKEN_KEY (32 bytes, base64 or hex) or JWT_SECRET');
  }
  if (!warnedDerived) {
    warnedDerived = true;
    logs.server.warn('social-accounts', 'tokenKey', {
      msg: 'SOCIAL_TOKEN_KEY is not set; social tokens are sealed with a key derived from JWT_SECRET',
    });
  }
  cachedKey = Buffer.from(hkdfSync('sha256', secret, HKDF_SALT, HKDF_INFO, KEY_BYTES));
  return cachedKey;
}

export const isSealed = (value: string | null | undefined): boolean => typeof value === 'string' && value.startsWith(PREFIX);

/** The stored form of a token; '' stays '' so an absent token is still absent. */
export function sealToken(plain: string): string {
  if (!plain) return '';
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, resolveKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX + VERSION, iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join(':');
}

/**
 * The token a stored value holds. A legacy plaintext value comes back as-is;
 * a sealed one that will not open (wrong key, tampered) throws — a reader must
 * never carry on with garbage where a token should be.
 */
export function openToken(stored: string | null | undefined): string {
  if (!stored) return '';
  if (!isSealed(stored)) return stored;
  const [version, iv, tag, ciphertext] = stored.slice(PREFIX.length).split(':');
  if (version !== VERSION || !iv || !tag || !ciphertext) {
    throw new Error('the stored social token is not in a form this server can open');
  }
  const decipher = createDecipheriv(ALGORITHM, resolveKey(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  try {
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    throw new Error('the stored social token could not be opened — it was sealed with another key or altered');
  }
}

/** The sealed form of a value that may already be sealed. */
const sealIfPlain = (value: string): string => (isSealed(value) ? value : sealToken(value));

interface LegacyTokens {
  _id: unknown;
  access_token?: string;
  refresh_token?: string;
}

/**
 * Seal every token still stored in the clear. Idempotent and safe on every
 * boot: a sealed token is skipped, so once the pass has run it finds nothing.
 * Returns how many accounts were sealed.
 */
export async function sealLegacyTokens(): Promise<number> {
  const plain = { $nin: ['', null], $not: /^enc:/ };
  const docs = await SocialAccountModel.find({ $or: [{ access_token: plain }, { refresh_token: plain }] })
    .select('+access_token +refresh_token')
    .lean<LegacyTokens[]>();
  for (const doc of docs) {
    await SocialAccountModel.updateOne(
      { _id: doc._id },
      { $set: { access_token: sealIfPlain(doc.access_token ?? ''), refresh_token: sealIfPlain(doc.refresh_token ?? '') } }
    );
  }
  if (docs.length > 0) {
    logs.server.info('social-accounts', 'sealLegacyTokens', { accounts: docs.length, msg: 'sealed stored social tokens' });
  }
  return docs.length;
}
