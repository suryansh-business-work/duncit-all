import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * `X-Hub-Signature-256: sha256=<hex>` — the HMAC-SHA256 of the raw request
 * body that GitHub and Meta both sign their webhooks with. Compared in
 * constant time; an empty secret or a header in any other shape never passes.
 */
export function validHubSignature(secret: string, body: Buffer, header: string): boolean {
  if (!secret || !header.startsWith('sha256=')) return false;
  const expected = Buffer.from(`sha256=${createHmac('sha256', secret).update(body).digest('hex')}`);
  const given = Buffer.from(header);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
