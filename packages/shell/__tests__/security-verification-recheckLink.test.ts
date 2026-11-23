/**
 * The link that notices "this token was verified, and now every request is
 * refused as signed-out" — the sign of the consent terms having changed — and
 * tells the gate to ask the server whether the screen is owed again. It must
 * fire for exactly that and nothing else, and never in a loop.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (arg: { error?: unknown; operation?: { operationName?: string } }) => void;
const cap = vi.hoisted(() => ({ handler: null as Handler | null }));
vi.mock('@apollo/client/link/error', () => ({
  onError: vi.fn((handler: Handler) => {
    cap.handler = handler;
    return { __err: true };
  }),
}));

import { createPortalSecurityRecheckLink } from '../src/security-verification/recheckLink';
import { PORTAL_SECURITY_RECHECK_EVENT } from '../src/security-verification/sessionClaim';
import { pendingToken, portalToken, verifiedToken } from './helpers/portalToken';

const refused = { errors: [{ message: 'Not authenticated', extensions: { code: 'UNAUTHENTICATED' } }] };
const listener = vi.fn();

/** Build the link for a token and hand back the callback it registered. */
function linkFor(token: string | null) {
  createPortalSecurityRecheckLink(() => token);
  return cap.handler as Handler;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-23T10:00:00Z'));
  listener.mockClear();
  globalThis.window.addEventListener(PORTAL_SECURITY_RECHECK_EVENT, listener);
});

afterEach(() => {
  globalThis.window.removeEventListener(PORTAL_SECURITY_RECHECK_EVENT, listener);
  vi.useRealTimers();
});

describe('createPortalSecurityRecheckLink', () => {
  it('tells the gate when a verified token starts being refused as signed-out', () => {
    linkFor(verifiedToken())({ error: refused, operation: { operationName: 'MyLoginActivity' } });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('says it once for a page full of failing queries, and again after the gap', () => {
    const handle = linkFor(verifiedToken());
    handle({ error: refused });
    handle({ error: refused });
    vi.advanceTimersByTime(14_000);
    handle({ error: refused });
    expect(listener).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1_500);
    handle({ error: refused });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('does not answer the check\'s own refusal, which would never end', () => {
    linkFor(verifiedToken())({ error: refused, operation: { operationName: 'PortalSecurityChallenge' } });
    expect(listener).not.toHaveBeenCalled();
  });

  it.each([
    ['another kind of refusal', { errors: [{ message: 'x', extensions: { code: 'FORBIDDEN' } }] }],
    ['a refusal with no code', { errors: [{ message: 'x' }] }],
    ['an error with no list of errors (a network failure)', new Error('Failed to fetch')],
    ['no error', undefined],
  ])('stays quiet for %s', (_name, error) => {
    linkFor(verifiedToken())({ error });
    expect(listener).not.toHaveBeenCalled();
  });

  it.each([
    ['a sign-in that has not completed the screen', pendingToken()],
    ['a token with no claim', portalToken()],
    ['no token at all', null],
  ])('stays quiet for %s — nothing was verified, so nothing went stale', (_name, token) => {
    linkFor(token)({ error: refused });
    expect(listener).not.toHaveBeenCalled();
  });
});
