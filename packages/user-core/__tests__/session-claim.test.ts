/**
 * What a client can tell about Security Verification from its own token. It
 * only decides what to SHOW (the server refuses an unverified token on every
 * request regardless), so the reader is forgiving about anything that is not
 * one of our tokens and strict about what counts as a claim.
 */
import { describe, expect, it } from 'vitest';
import { isPortalTokenPending, isPortalTokenVerified, readSessionClaim } from '../src/session-claim';

const token = (psv?: unknown) => {
  const payload = Buffer.from(JSON.stringify(psv === undefined ? { id: 'u1' } : { id: 'u1', psv })).toString('base64url');
  return `header.${payload}.signature`;
};

describe('readSessionClaim', () => {
  it('reads a console sign-in that has not completed the screen', () => {
    expect(readSessionClaim(token({ portal: 'crm', verified: false }))).toEqual({ portal: 'crm', verified: false, policy: undefined });
  });

  it('reads a verified session with the policy version it consented to', () => {
    expect(readSessionClaim(token({ portal: 'crm', verified: true, policy: 'v7' }))).toEqual({ portal: 'crm', verified: true, policy: 'v7' });
  });

  it('ignores a policy that is not text', () => {
    expect(readSessionClaim(token({ portal: 'crm', verified: true, policy: 7 }))?.policy).toBeUndefined();
  });

  it('reads a payload that uses the URL-safe alphabet', () => {
    const urlSafe = token({ portal: '~~~~~~~~~~~~', verified: false });
    expect(urlSafe.split('.')[1]).toMatch(/[-_]/);
    expect(readSessionClaim(urlSafe)).toMatchObject({ portal: '~~~~~~~~~~~~', verified: false });
  });

  it('has nothing to read from a token with no claim', () => {
    expect(readSessionClaim(token())).toBeNull();
  });

  it.each([
    ['missing', null],
    ['also missing', undefined],
    ['empty', ''],
    ['not a JWT at all', 'plain-text'],
    ['a payload that is not base64', 'a.%%%.c'],
    ['a payload that is not JSON', `a.${Buffer.from('hello').toString('base64url')}.c`],
  ])('has nothing to read from a token that is %s', (_name, value) => {
    expect(readSessionClaim(value)).toBeNull();
  });

  it.each([
    ['no portal', { verified: true }],
    ['a portal that is not text', { portal: 4, verified: true }],
    ['no verified flag', { portal: 'crm' }],
    ['a verified flag that is not a boolean', { portal: 'crm', verified: 'yes' }],
    ['not an object', 'verified'],
  ])('does not trust a claim with %s', (_name, psv) => {
    expect(readSessionClaim(token(psv))).toBeNull();
  });
});

describe('isPortalTokenPending / isPortalTokenVerified', () => {
  it('tells the three kinds of token apart', () => {
    const pending = token({ portal: 'crm', verified: false });
    const verified = token({ portal: 'crm', verified: true });
    expect([isPortalTokenPending(pending), isPortalTokenVerified(pending)]).toEqual([true, false]);
    expect([isPortalTokenPending(verified), isPortalTokenVerified(verified)]).toEqual([false, true]);
    expect([isPortalTokenPending(token()), isPortalTokenVerified(token())]).toEqual([false, false]);
  });

  it('treats no token as neither', () => {
    expect([isPortalTokenPending(null), isPortalTokenVerified(undefined)]).toEqual([false, false]);
  });
});
