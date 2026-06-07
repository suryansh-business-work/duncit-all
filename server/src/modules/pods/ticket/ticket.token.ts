import crypto from 'crypto';

/**
 * Compact, HMAC-signed QR payload for an event ticket. Format is
 * `base64url(payload).base64url(hmac)` so a scanner (admin check-in) can verify
 * authenticity + integrity offline against the server secret. The payload only
 * carries opaque ids — the real ticket data is looked up server-side by code.
 */
export interface TicketTokenPayload {
  t: string; // ticket_code
  u: string; // user_id
  p: string; // pod_id
  m: string; // membership_id
}

const secret = () => process.env.JWT_SECRET || 'dev-secret';

export function signTicketToken(payload: TicketTokenPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyTicketToken(token: string): TicketTokenPayload | null {
  const [body, sig] = (token || '').split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString()) as TicketTokenPayload;
  } catch {
    return null;
  }
}
