import { createHmac } from 'node:crypto';
import { signedLink } from '@utils/signed-link';

const TTL = 60_000;
const PURPOSE = 'ticket-pdf';

/** A token this signer WOULD accept, carrying a payload of the test's choosing —
 * the only way to reach the shape checks past the signature. */
const validlySigned = (payload: unknown): string => {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const key = process.env.JWT_SECRET || 'dev-secret';
  const signature = createHmac('sha256', key).update(`${PURPOSE}:${body}`).digest('base64url');
  return `${body}.${signature}`;
};

describe('signedLink', () => {
  const link = signedLink(PURPOSE, TTL);

  it('round-trips the id it names', () => {
    expect(link.verify(link.sign('abc123'))).toBe('abc123');
  });

  it('rejects a forged, malformed or empty token', () => {
    const [body] = link.sign('abc123').split('.');
    expect(link.verify(`${body}.deadbeef`)).toBeNull();
    expect(link.verify(`${body}.${'a'.repeat(43)}`)).toBeNull();
    expect(link.verify('nodot')).toBeNull();
    expect(link.verify('')).toBeNull();
  });

  it('rejects a token past its window', () => {
    const now = Date.now();
    const token = link.sign('abc123', now);
    expect(link.verify(token, now + TTL - 1)).toBe('abc123');
    expect(link.verify(token, now + TTL + 1)).toBeNull();
  });

  it('rejects a token signed for a different route', () => {
    const other = signedLink('db-backup', TTL);
    expect(link.verify(other.sign('abc123'))).toBeNull();
  });

  it('rejects a correctly signed token whose payload is not the shape it signs', () => {
    const soon = Date.now() + TTL;
    expect(link.verify(validlySigned({ e: soon }))).toBeNull();
    expect(link.verify(validlySigned({ i: 'abc123', e: String(soon) }))).toBeNull();
    expect(link.verify(validlySigned('not-an-object'))).toBeNull();
  });

  it('rejects a correctly signed body that is not JSON at all', () => {
    const body = Buffer.from('{ not json', 'utf8').toString('base64url');
    const key = process.env.JWT_SECRET || 'dev-secret';
    const signature = createHmac('sha256', key).update(`${PURPOSE}:${body}`).digest('base64url');
    expect(link.verify(`${body}.${signature}`)).toBeNull();
  });
});
