/**
 * Settings › Integrations › <network> › Test connection: one entry, one
 * probe. The keys typed into the entry are the ones tested, and the redirect
 * URL the app must register is named only when the answer is about it.
 */
jest.mock('../../providers', () => ({
  PROBES: {
    INSTAGRAM: jest.fn(),
    FACEBOOK: jest.fn(),
    THREADS: jest.fn(),
    YOUTUBE: jest.fn(),
    LINKEDIN: jest.fn(),
    X: jest.fn(),
  },
}));
jest.mock('../../social.credentials', () => ({
  ...jest.requireActual('../../social.credentials'),
  socialRedirectUri: jest.fn(async () => 'https://api.duncit.test/social/callback'),
}));

import { PROBES } from '../../providers';
import { probeSocialApp } from '../../social.probe';

const entry = (fields: Record<string, string>) => (name: string) => fields[name] ?? '';
const probe = PROBES.INSTAGRAM as jest.Mock;
const CALLBACK = 'The Instagram app must list https://api.duncit.test/social/callback as a valid OAuth redirect URI.';

beforeEach(() => probe.mockReset());

describe('probeSocialApp', () => {
  it('asks for both keys before troubling the provider', async () => {
    const res = await probeSocialApp('INSTAGRAM')(entry({ app_id: 'only-the-id' }));
    expect(res).toEqual({ ok: false, message: 'Instagram: fill in both app_id and app_secret first', details: [] });
    expect(probe).not.toHaveBeenCalled();
  });

  it('puts the typed keys and Login configuration in front of the network and relays its verdict, with no redirect note on a pass', async () => {
    probe.mockResolvedValue({ ok: true, message: 'Instagram accepted the App ID and Secret' });
    const res = await probeSocialApp('INSTAGRAM')(
      entry({ app_id: 'id', app_secret: 'secret', graph_version: 'v24.0', login_config_id: ' 293343 ' })
    );
    expect(res).toEqual({ ok: true, message: 'Instagram accepted the App ID and Secret', details: [] });
    expect(probe).toHaveBeenCalledWith({
      clientId: 'id',
      clientSecret: 'secret',
      redirectUri: 'https://api.duncit.test/social/callback',
      version: 'v24.0',
      configId: '293343',
    });
  });

  it('relays a refusal that has nothing to do with the redirect without naming the callback', async () => {
    probe.mockResolvedValue({ ok: false, message: 'Instagram rejected the App ID or Secret — Error validating client secret.' });
    const res = await probeSocialApp('INSTAGRAM')(entry({ app_id: 'id', app_secret: 'bad' }));
    expect(res).toEqual({ ok: false, message: 'Instagram rejected the App ID or Secret — Error validating client secret.', details: [] });
  });

  it('names the callback URL when the refusal is about the redirect', async () => {
    (PROBES.THREADS as jest.Mock).mockResolvedValue({ ok: false, message: 'Threads rejected the App ID or Secret (redirect_uri is not registered)' });
    const res = await probeSocialApp('THREADS')(entry({ app_id: 'id', app_secret: 'secret' }));
    expect(res.details).toEqual(['The Threads app must list https://api.duncit.test/social/callback as a valid OAuth redirect URI.']);
  });

  it('names the network when the provider could not be reached at all', async () => {
    probe.mockRejectedValue(new Error('ECONNRESET'));
    const res = await probeSocialApp('INSTAGRAM')(entry({ app_id: 'id', app_secret: 'secret' }));
    expect(res).toEqual({ ok: false, message: 'Instagram: could not reach the provider (ECONNRESET)', details: [] });
  });

  it('names the callback when an unreachable provider failed on the callback, and copes with a non-Error failure', async () => {
    probe.mockRejectedValue('bad callback host');
    const res = await probeSocialApp('INSTAGRAM')(entry({ app_id: 'id', app_secret: 'secret' }));
    expect(res).toEqual({ ok: false, message: 'Instagram: could not reach the provider (bad callback host)', details: [CALLBACK] });
  });

  it('tests only the network it was built for, and sends no Login configuration for a network without one', async () => {
    (PROBES.THREADS as jest.Mock).mockResolvedValue({ ok: true, message: 'Threads accepted the App ID and Secret' });
    const res = await probeSocialApp('THREADS')(entry({ app_id: 'id', app_secret: 'secret', login_config_id: 'ignored' }));
    expect(res.message).toBe('Threads accepted the App ID and Secret');
    expect(PROBES.THREADS).toHaveBeenCalledWith({ clientId: 'id', clientSecret: 'secret', redirectUri: 'https://api.duncit.test/social/callback', version: 'v1.0' });
    expect(probe).not.toHaveBeenCalled();
  });
});
