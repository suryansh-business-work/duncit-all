/**
 * A console session token as the browser sees one: three dot-separated parts
 * whose middle part is the base64url JSON payload. The signature is a stand-in —
 * the browser never checks it, and nothing under test does either.
 */
export function portalToken(psv?: unknown, extra: Record<string, unknown> = {}): string {
  const payload = { id: 'u1', ...extra, ...(psv === undefined ? {} : { psv }) };
  return `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`;
}

export const pendingToken = (portal = 'finance') => portalToken({ portal, verified: false });
export const verifiedToken = (portal = 'finance', policy = 'v1') => portalToken({ portal, verified: true, policy });
