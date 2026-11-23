/**
 * What the browser can tell about Security Verification from its own token.
 * It only decides what to SHOW (the server refuses an unverified token on every
 * request regardless), so the reader has to be forgiving about anything that is
 * not one of our tokens and strict about what counts as a claim.
 */
import { describe, expect, it } from 'vitest';
import {
  isPortalTokenPending,
  isPortalTokenVerified,
  readSessionClaim,
} from '../src/security-verification/sessionClaim';
import { pendingToken, portalToken, verifiedToken } from './helpers/portalToken';

describe('readSessionClaim', () => {
  it('reads the claim of a console sign-in that has not completed the screen', () => {
    expect(readSessionClaim(pendingToken('tech'))).toEqual({ portal: 'tech', verified: false, policy: undefined });
  });

  it('reads the claim of a verified session with the version it consented to', () => {
    expect(readSessionClaim(verifiedToken('tech', 'v7'))).toEqual({ portal: 'tech', verified: true, policy: 'v7' });
  });

  it('ignores a policy that is not text', () => {
    expect(readSessionClaim(portalToken({ portal: 'tech', verified: true, policy: 7 }))?.policy).toBeUndefined();
  });

  it('reads a payload that uses the URL-safe alphabet', () => {
    // Twelve "~" start on a three-byte boundary and encode to "fn5-", so the "-" proves the mapping.
    const token = portalToken({ portal: '~~~~~~~~~~~~', verified: false });
    expect(token.split('.')[1]).toMatch(/[-_]/);
    expect(readSessionClaim(token)).toMatchObject({ portal: '~~~~~~~~~~~~', verified: false });
  });

  it('has nothing to read from a token with no claim', () => {
    expect(readSessionClaim(portalToken())).toBeNull();
  });

  it.each([
    ['missing', null],
    ['also missing', undefined],
    ['empty', ''],
    ['not a JWT at all', 'plain-text'],
    ['a JWT with an empty payload', 'a..c'],
    ['a payload that is not base64', 'a.%%%.c'],
    ['a payload that is not JSON', `a.${Buffer.from('hello').toString('base64url')}.c`],
  ])('has nothing to read from a token that is %s', (_name, token) => {
    expect(readSessionClaim(token)).toBeNull();
  });

  it.each([
    ['no portal', { verified: true }],
    ['a portal that is not text', { portal: 4, verified: true }],
    ['no verified flag', { portal: 'tech' }],
    ['a verified flag that is not a boolean', { portal: 'tech', verified: 'yes' }],
    ['not an object', 'verified'],
  ])('does not trust a claim with %s', (_name, psv) => {
    expect(readSessionClaim(portalToken(psv))).toBeNull();
  });
});

describe('isPortalTokenPending / isPortalTokenVerified', () => {
  it('tells the three kinds of token apart', () => {
    expect([isPortalTokenPending(pendingToken()), isPortalTokenVerified(pendingToken())]).toEqual([true, false]);
    expect([isPortalTokenPending(verifiedToken()), isPortalTokenVerified(verifiedToken())]).toEqual([false, true]);
    expect([isPortalTokenPending(portalToken()), isPortalTokenVerified(portalToken())]).toEqual([false, false]);
  });

  it('treats no token as neither', () => {
    expect([isPortalTokenPending(null), isPortalTokenVerified(null)]).toEqual([false, false]);
    expect([isPortalTokenPending(undefined), isPortalTokenVerified(undefined)]).toEqual([false, false]);
  });
});
