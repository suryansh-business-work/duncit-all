import { describe, expect, it } from 'vitest';

import {
  claimGoogleSignupHandoff,
  createGoogleSignupClaims,
  openGoogleSignup,
  readGoogleSignupHandoff,
  type GoogleSignupHandoff,
} from '../src/google-signup-handoff';

const RIYA: GoogleSignupHandoff = { idToken: 'google-id-token-riya', email: 'riya@duncit.com' };
const ARJUN: GoogleSignupHandoff = { idToken: 'google-id-token-arjun', email: 'arjun@duncit.com' };

describe('openGoogleSignup', () => {
  it('opens an invite for the credential when none is open', () => {
    expect(openGoogleSignup(null, RIYA.idToken, RIYA.email)).toEqual(RIYA);
  });

  it('keeps the open invite, unchanged and the same object, for the same credential', () => {
    const open = openGoogleSignup(null, RIYA.idToken, RIYA.email);

    // A double tap must not stack a second invite or swap the credential.
    expect(openGoogleSignup(open, RIYA.idToken, 'changed@duncit.com')).toBe(open);
  });

  it('replaces the invite when a different person signs in', () => {
    const open = openGoogleSignup(null, RIYA.idToken, RIYA.email);

    expect(openGoogleSignup(open, ARJUN.idToken, ARJUN.email)).toEqual(ARJUN);
  });
});

describe('readGoogleSignupHandoff', () => {
  it('reads a complete pair back, dropping anything else it carried', () => {
    expect(readGoogleSignupHandoff({ ...RIYA, from: '/login' })).toEqual(RIYA);
  });

  it('is null when navigation carried nothing, or not an object', () => {
    expect(readGoogleSignupHandoff(undefined)).toBeNull();
    expect(readGoogleSignupHandoff(null)).toBeNull();
    expect(readGoogleSignupHandoff('google-id-token-riya')).toBeNull();
  });

  it('is null without a usable token', () => {
    expect(readGoogleSignupHandoff({ email: RIYA.email })).toBeNull();
    expect(readGoogleSignupHandoff({ idToken: 42, email: RIYA.email })).toBeNull();
    expect(readGoogleSignupHandoff({ idToken: '   ', email: RIYA.email })).toBeNull();
  });

  it('is null without an email', () => {
    expect(readGoogleSignupHandoff({ idToken: RIYA.idToken })).toBeNull();
  });
});

describe('claimGoogleSignupHandoff', () => {
  it('starts a ledger that has claimed nothing', () => {
    expect(createGoogleSignupClaims()).toEqual({ last: null });
  });

  it('hands a credential over once, then answers null for the same one', () => {
    const claims = createGoogleSignupClaims();

    expect(claimGoogleSignupHandoff(claims, RIYA)).toBe(RIYA);
    // A remount re-reading the same navigation param is not a new signup.
    expect(claimGoogleSignupHandoff(claims, { ...RIYA })).toBeNull();
    expect(claims.last).toBe(RIYA.idToken);
  });

  it('claims a different credential freshly', () => {
    const claims = createGoogleSignupClaims();
    claimGoogleSignupHandoff(claims, RIYA);

    expect(claimGoogleSignupHandoff(claims, ARJUN)).toBe(ARJUN);
    expect(claims.last).toBe(ARJUN.idToken);
  });

  it('claims nothing when there is no handoff', () => {
    const claims = createGoogleSignupClaims();

    expect(claimGoogleSignupHandoff(claims, null)).toBeNull();
    expect(claims.last).toBeNull();
  });
});
