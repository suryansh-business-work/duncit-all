/**
 * The connect round trip's signed state: it carries the provider, the person,
 * the page to come back to and the app chosen to connect through, and a state
 * signed before apps could be chosen still reads (as the default app).
 */
import { createHash } from 'node:crypto';
import { signedLink } from '@utils/signed-link';
import { readConnectState, startConnect } from '../../social.oauth';

const APP = '665f1c2b9d3e4a0012345678';

describe('startConnect / readConnectState', () => {
  it('round-trips the chosen app with the provider, person and return page', () => {
    const { state, challenge } = startConnect('FACEBOOK', 'user-1', 'CALENDAR', APP);
    const read = readConnectState(state);
    expect(read).toMatchObject({ provider: 'FACEBOOK', userId: 'user-1', returnTo: 'CALENDAR', appId: APP });
    // The PKCE challenge is the verifier the callback recomputes, hashed.
    expect(createHash('sha256').update(read?.verifier ?? '').digest('base64url')).toBe(challenge);
  });

  it('reads no app as the default app', () => {
    expect(readConnectState(startConnect('X', 'user-2', 'ACCOUNTS').state)?.appId).toBe('');
  });

  it('carries a Reconnect through the round trip, and reads a plain Connect (or an older link) as none', () => {
    expect(readConnectState(startConnect('FACEBOOK', 'user-5', 'ACCOUNTS', APP, true).state)).toMatchObject({ appId: APP, reconnect: true });
    expect(readConnectState(startConnect('FACEBOOK', 'user-5', 'ACCOUNTS', '', true).state)).toMatchObject({ appId: '', reconnect: true });
    expect(readConnectState(startConnect('FACEBOOK', 'user-5', 'ACCOUNTS', APP).state)?.reconnect).toBe(false);
    const fivePart = signedLink('social_connect', 60_000).sign(`FACEBOOK.user-6.nonce-2.ACCOUNTS.${APP}`);
    expect(readConnectState(fivePart)).toMatchObject({ appId: APP, reconnect: false });
  });

  it('still reads a state signed before apps could be chosen, as the default app', () => {
    const legacy = signedLink('social_connect', 60_000).sign('LINKEDIN.user-3.nonce-1.ACCOUNTS');
    expect(readConnectState(legacy)).toMatchObject({ provider: 'LINKEDIN', userId: 'user-3', returnTo: 'ACCOUNTS', appId: '' });
  });

  it('refuses a forged state, another purpose and a malformed payload', () => {
    const { state } = startConnect('X', 'user-4', 'ACCOUNTS', APP);
    expect(readConnectState(`${state}x`)).toBeNull();
    expect(readConnectState(signedLink('db_backup', 60_000).sign('X.user-4.n.ACCOUNTS'))).toBeNull();
    expect(readConnectState(signedLink('social_connect', 60_000).sign('MYSPACE.user-4.n.ACCOUNTS'))).toBeNull();
    expect(readConnectState(signedLink('social_connect', 60_000).sign('X.user-4.n.HOME'))).toBeNull();
  });
});
