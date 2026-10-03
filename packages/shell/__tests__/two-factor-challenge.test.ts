/**
 * Reading a refused console sign-in. TWO_FACTOR_REQUIRED with a usable token
 * opens the authenticator step; anything else — another code, a missing or
 * blank token, a network failure — must stay an ordinary error. An expired
 * challenge means "sign in again", not "try another code".
 */
import { describe, expect, it } from 'vitest';
import {
  TWO_FACTOR_CHALLENGE_EXPIRED,
  TWO_FACTOR_REQUIRED,
  isChallengeExpired,
  twoFactorChallengeOf,
} from '../src/two-factor/challenge';

const refusal = (extensions?: Record<string, unknown>) => ({
  message: 'Refused',
  errors: [{ message: 'Refused', extensions }],
});

describe('twoFactorChallengeOf', () => {
  it('returns the challenge token a TWO_FACTOR_REQUIRED refusal carries', () => {
    expect(twoFactorChallengeOf(refusal({ code: TWO_FACTOR_REQUIRED, challenge_token: 'chal-1' }))).toEqual({
      token: 'chal-1',
    });
  });

  it('reads the Apollo 3 graphQLErrors shape as well', () => {
    const error = { graphQLErrors: [{ message: 'x', extensions: { code: 'TWO_FACTOR_REQUIRED', challenge_token: 'c2' } }] };
    expect(twoFactorChallengeOf(error)).toEqual({ token: 'c2' });
  });

  it('is null for a refusal with any other code', () => {
    expect(twoFactorChallengeOf(refusal({ code: 'UNAUTHENTICATED', challenge_token: 'chal-1' }))).toBeNull();
  });

  it('is null when the GraphQL error has no extensions at all', () => {
    expect(twoFactorChallengeOf(refusal())).toBeNull();
  });

  it('is null for an error that is not a GraphQL error, or for nothing', () => {
    expect(twoFactorChallengeOf(new Error('Failed to fetch'))).toBeNull();
    expect(twoFactorChallengeOf(null)).toBeNull();
  });

  it('is null when the token is missing, blank or not a string', () => {
    expect(twoFactorChallengeOf(refusal({ code: TWO_FACTOR_REQUIRED }))).toBeNull();
    expect(twoFactorChallengeOf(refusal({ code: TWO_FACTOR_REQUIRED, challenge_token: '' }))).toBeNull();
    expect(twoFactorChallengeOf(refusal({ code: TWO_FACTOR_REQUIRED, challenge_token: 42 }))).toBeNull();
  });
});

describe('isChallengeExpired', () => {
  it('is true only for TWO_FACTOR_CHALLENGE_EXPIRED', () => {
    expect(isChallengeExpired(refusal({ code: TWO_FACTOR_CHALLENGE_EXPIRED }))).toBe(true);
    expect(isChallengeExpired(refusal({ code: 'BAD_USER_INPUT' }))).toBe(false);
  });

  it('is false for an error without GraphQL extensions, or for nothing', () => {
    expect(isChallengeExpired(refusal())).toBe(false);
    expect(isChallengeExpired(new Error('Invalid code'))).toBe(false);
    expect(isChallengeExpired(undefined)).toBe(false);
  });
});
