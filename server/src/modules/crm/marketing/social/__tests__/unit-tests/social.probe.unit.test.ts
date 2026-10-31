/**
 * Settings › Integrations › <network> › Test connection: one entry, one
 * probe. The keys typed into the entry are the ones tested, and the answer
 * always carries the redirect URL the app must register.
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
const CALLBACK = 'The Instagram app must list https://api.duncit.test/social/callback as its redirect (callback) URL.';

beforeEach(() => probe.mockReset());

describe('probeSocialApp', () => {
  it('asks for both keys before troubling the provider', async () => {
    const res = await probeSocialApp('INSTAGRAM')(entry({ app_id: 'only-the-id' }));
    expect(res).toEqual({ ok: false, message: 'Instagram: fill in both app_id and app_secret first', details: [CALLBACK] });
    expect(probe).not.toHaveBeenCalled();
  });

  it('puts the typed keys in front of the network and relays its verdict', async () => {
    probe.mockResolvedValue({ ok: true, message: 'Instagram accepted the App ID and Secret' });
    const res = await probeSocialApp('INSTAGRAM')(entry({ app_id: 'id', app_secret: 'secret', graph_version: 'v24.0' }));
    expect(res).toEqual({ ok: true, message: 'Instagram accepted the App ID and Secret', details: [CALLBACK] });
    expect(probe).toHaveBeenCalledWith({
      clientId: 'id',
      clientSecret: 'secret',
      redirectUri: 'https://api.duncit.test/social/callback',
      version: 'v24.0',
    });
  });

  it('relays a refusal as a failed test', async () => {
    probe.mockResolvedValue({ ok: false, message: 'Instagram rejected the App ID or Secret (Invalid platform app)' });
    const res = await probeSocialApp('INSTAGRAM')(entry({ app_id: 'id', app_secret: 'bad' }));
    expect(res.ok).toBe(false);
    expect(res.message).toBe('Instagram rejected the App ID or Secret (Invalid platform app)');
  });

  it('names the network when the provider could not be reached at all', async () => {
    probe.mockRejectedValue(new Error('ECONNRESET'));
    const res = await probeSocialApp('INSTAGRAM')(entry({ app_id: 'id', app_secret: 'secret' }));
    expect(res).toEqual({ ok: false, message: 'Instagram: could not reach the provider (ECONNRESET)', details: [CALLBACK] });
  });

  it('tests only the network it was built for', async () => {
    (PROBES.THREADS as jest.Mock).mockResolvedValue({ ok: true, message: 'Threads accepted the App ID and Secret' });
    const res = await probeSocialApp('THREADS')(entry({ app_id: 'id', app_secret: 'secret' }));
    expect(res.message).toBe('Threads accepted the App ID and Secret');
    expect(res.details[0]).toContain('The Threads app must list');
    expect(probe).not.toHaveBeenCalled();
  });
});
