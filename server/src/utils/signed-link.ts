import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * A short-lived, HMAC-signed permission to fetch ONE document over a public
 * route.
 *
 * Two things in this server need exactly this and nothing more: a database
 * archive the Tech portal pulls through the browser, and the ticket PDF AiSensy
 * fetches for a WhatsApp document header. Neither can ride the session token —
 * a browser download is a plain GET the page cannot put an Authorization header
 * on, and AiSensy fetches from its own servers with no session at all — so the
 * link itself has to be the credential.
 *
 * Stateless on purpose: nothing to store, nothing to clean up, and a signature
 * that survives a restart. The cost is that a minted token cannot be revoked
 * before it expires, which is why every caller's window is minutes.
 *
 * The PURPOSE is signed in, so a token minted for one route can never open
 * another — the two callers name different documents by the same kind of id,
 * and without it a backup link and a ticket link would verify interchangeably.
 */

const signingKey = () => process.env.JWT_SECRET || 'dev-secret';

interface Payload {
  /** The document this token names. */
  i: string;
  /** Expiry, epoch milliseconds. */
  e: number;
}

export interface SignedLink {
  /** A token naming one document, good for this signer's window. */
  sign(id: string, now?: number): string;
  /** The document a token names, or null when it is forged, expired, or was
   * signed for a different route. */
  verify(token: string, now?: number): string | null;
}

/** A signer/verifier pair for one route. `ttlMs` is how long its links live. */
export function signedLink(purpose: string, ttlMs: number): SignedLink {
  const signature = (body: string) =>
    createHmac('sha256', signingKey()).update(`${purpose}:${body}`).digest('base64url');

  return {
    sign(id: string, now: number = Date.now()): string {
      const payload: Payload = { i: id, e: now + ttlMs };
      const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
      return `${body}.${signature(body)}`;
    },

    verify(token: string, now: number = Date.now()): string | null {
      const [body, given] = (token || '').split('.');
      if (!body || !given) return null;
      // Constant time: the link IS the credential, so a mismatch is compared
      // the way a password would be.
      const expected = Buffer.from(signature(body));
      const supplied = Buffer.from(given);
      if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
      try {
        const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as Payload;
        if (!payload.i || typeof payload.e !== 'number' || payload.e < now) return null;
        return payload.i;
      } catch {
        return null;
      }
    },
  };
}
