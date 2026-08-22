import crypto from 'node:crypto';
import { GraphQLError } from 'graphql';
import { CAPTCHA_LENGTH, generateCaptchaCode, renderCaptchaImage } from './captcha.image';

/**
 * One human check for every public form on the platform.
 *
 * Every form that anyone on the internet can post — the websites' contact,
 * grievance, FAQ and newsletter forms, and the status page's problem report —
 * reaches the same three lines here. Written once because a second
 * implementation drifts on exactly the parts that matter: how long a code
 * lives, and whether it can be used twice.
 *
 * NOTHING is stored per challenge. The token IS the challenge: a signed
 * envelope carrying a nonce, an expiry and the HASH of the answer, so the
 * server can check a code it never kept. That matters more than the byte
 * saving — a captcha that needs a row in Mongo is a captcha that fails when
 * the database is the thing being reported as down.
 *
 * The one piece of state is the SPENT list, and it exists because a stateless
 * token is by definition replayable: solve once, post a thousand times inside
 * the window. Nonces are held only until they expire.
 */

const TTL_MS = 10 * 60 * 1000;
/** A spent nonce is ~90 bytes; the cap is a backstop, not a working limit. */
const MAX_SPENT = 20_000;
const VERSION = 'c1';

const secret = (): string => process.env.JWT_SECRET || 'dev-secret';

/** Nonce -> when it stops mattering. */
const spent = new Map<string, number>();

function sweep(): void {
  const now = Date.now();
  for (const [nonce, expiresAt] of spent) {
    if (expiresAt <= now) spent.delete(nonce);
  }
}

/**
 * What the user typed, as the code would have been generated.
 *
 * The alphabet has no ambiguous characters in it, so this is only ever
 * forgiving about case and stray spaces — a person reading five letters off a
 * picture should not fail on the shift key.
 */
export const normaliseAnswer = (raw: string): string =>
  (raw || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

const digest = (value: string): string =>
  crypto.createHash('sha256').update(`${value}:${secret()}`).digest('base64url');

const sign = (body: string): string =>
  crypto.createHmac('sha256', secret()).update(body).digest('base64url');

interface CaptchaPayload {
  /** Nonce — what the spent list remembers. */
  n: string;
  /** Hash of the answer, so the code itself never leaves the process. */
  h: string;
  /** Expiry, epoch ms. */
  e: number;
}

export interface CaptchaChallenge {
  token: string;
  image: string;
  expires_in: number;
}

/** Mint a challenge: a picture for the person, a signed token for the form. */
export function issueCaptcha(): CaptchaChallenge {
  const code = generateCaptchaCode();
  const payload: CaptchaPayload = {
    n: crypto.randomBytes(9).toString('base64url'),
    h: digest(code),
    e: Date.now() + TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return {
    token: `${VERSION}.${body}.${sign(body)}`,
    image: renderCaptchaImage(code),
    expires_in: Math.floor(TTL_MS / 1000),
  };
}

/** Signature-checked payload, or null when the token was not minted here. */
function openToken(token: string): CaptchaPayload | null {
  const [version, body, signature] = (token || '').split('.');
  if (version !== VERSION || !body || !signature) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString()) as CaptchaPayload;
  } catch {
    return null;
  }
}

export type CaptchaVerdict = 'OK' | 'INVALID' | 'EXPIRED' | 'SPENT' | 'WRONG';

/**
 * Check one answer and burn the token.
 *
 * Burned on EVERY outcome, right or wrong: letting a token survive a wrong
 * answer turns one challenge into unlimited guesses at 31^5, which a script
 * finishes long before the ten minutes are up.
 */
export function checkCaptcha(token: string, answer: string): CaptchaVerdict {
  const payload = openToken(token);
  if (!payload) return 'INVALID';
  if (payload.e <= Date.now()) return 'EXPIRED';

  sweep();
  if (spent.has(payload.n)) return 'SPENT';
  // Refuse to grow without bound rather than quietly forgetting the oldest —
  // forgetting is what makes a replay work again.
  if (spent.size >= MAX_SPENT) return 'INVALID';
  spent.set(payload.n, payload.e);

  const given = normaliseAnswer(answer);
  if (given.length !== CAPTCHA_LENGTH) return 'WRONG';
  const a = Buffer.from(digest(given));
  const b = Buffer.from(payload.h);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return 'WRONG';
  return 'OK';
}

/** The reason, as a code the client can branch on. Copy stays on the client. */
const VERDICT_CODE: Record<Exclude<CaptchaVerdict, 'OK'>, string> = {
  INVALID: 'CAPTCHA_INVALID',
  EXPIRED: 'CAPTCHA_EXPIRED',
  SPENT: 'CAPTCHA_EXPIRED',
  WRONG: 'CAPTCHA_WRONG',
};

const VERDICT_MESSAGE: Record<Exclude<CaptchaVerdict, 'OK'>, string> = {
  INVALID: 'The verification code could not be checked. Please try a new one.',
  EXPIRED: 'The verification code expired. Please try a new one.',
  SPENT: 'The verification code expired. Please try a new one.',
  WRONG: 'The verification code does not match. Please try again.',
};

/** Throw unless the answer is right. The only way any caller uses this. */
export function assertCaptcha(token: string, answer: string): void {
  const verdict = checkCaptcha(token, answer);
  if (verdict === 'OK') return;
  throw new GraphQLError(VERDICT_MESSAGE[verdict], {
    extensions: { code: VERDICT_CODE[verdict] },
  });
}

/** Test seam — the spent list is process state. */
export function resetCaptchaState(): void {
  spent.clear();
}
