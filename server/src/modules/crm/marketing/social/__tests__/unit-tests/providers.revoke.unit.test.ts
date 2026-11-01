/**
 * Letting go of a token: each network that documents a revoke endpoint is
 * asked the way it documents, and the ones that do not are left alone. The
 * outbound fetch is faked; the URL, method, body and auth are what is checked.
 */
jest.mock('@utils/outboundFetch', () => ({ outboundFetch: jest.fn() }));

import { outboundFetch } from '@utils/outboundFetch';
import { CONNECTORS } from '../../providers';
import type { SocialAccountHandle, SocialProvider } from '../../social.types';

const mockFetch = outboundFetch as jest.Mock;
const CREDS = { clientId: 'client-1', clientSecret: 'shh', redirectUri: 'https://api.duncit.test/social/callback', version: 'v23.0' };

const handle = (provider: SocialProvider, over: Partial<SocialAccountHandle> = {}): SocialAccountHandle => ({
  provider,
  platform: provider,
  external_id: '42',
  handle: 'duncit',
  access_token: 'AT',
  refresh_token: '',
  meta: {},
  ...over,
});

const ok = (body: unknown = { success: true }) => ({ ok: true, status: 200, json: async () => body, headers: new Headers() });
const refused = (status: number, body: unknown) => ({ ok: false, status, json: async () => body, headers: new Headers() });

beforeEach(() => mockFetch.mockReset());

describe('revoke', () => {
  it('Facebook: DELETE /me/permissions with the Page token', async () => {
    mockFetch.mockResolvedValue(ok());
    await CONNECTORS.FACEBOOK.revoke?.(handle('FACEBOOK'), CREDS);
    expect(mockFetch).toHaveBeenCalledWith(
      'Facebook',
      'https://graph.facebook.com/v23.0/me/permissions?access_token=AT',
      { method: 'DELETE' }
    );
  });

  it('Instagram: DELETE /me/permissions on graph.instagram.com', async () => {
    mockFetch.mockResolvedValue(ok());
    await CONNECTORS.INSTAGRAM.revoke?.(handle('INSTAGRAM'), CREDS);
    expect(mockFetch).toHaveBeenCalledWith(
      'Instagram',
      'https://graph.instagram.com/v23.0/me/permissions?access_token=AT',
      { method: 'DELETE' }
    );
  });

  it('YouTube: POST the refresh token to Google’s revoke endpoint, falling back to the access token', async () => {
    mockFetch.mockResolvedValue(ok({}));
    await CONNECTORS.YOUTUBE.revoke?.(handle('YOUTUBE', { refresh_token: 'RT' }), CREDS);
    expect(mockFetch).toHaveBeenCalledWith('YouTube', 'https://oauth2.googleapis.com/revoke?token=RT', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });
    await CONNECTORS.YOUTUBE.revoke?.(handle('YOUTUBE'), CREDS);
    expect(mockFetch).toHaveBeenLastCalledWith('YouTube', 'https://oauth2.googleapis.com/revoke?token=AT', expect.anything());
  });

  it('X: POST the access token to /oauth2/revoke with Basic auth', async () => {
    mockFetch.mockResolvedValue(ok({ revoked: true }));
    await CONNECTORS.X.revoke?.(handle('X'), CREDS);
    const [service, url, init] = mockFetch.mock.calls[0];
    expect(service).toBe('X');
    expect(url).toBe('https://api.x.com/2/oauth2/revoke');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      'content-type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from('client-1:shh').toString('base64')}`,
    });
    expect(Object.fromEntries(new URLSearchParams(init.body))).toEqual({
      token: 'AT',
      token_type_hint: 'access_token',
      client_id: 'client-1',
    });
  });

  it('relays a refusal as the provider’s own words, for the caller to log', async () => {
    mockFetch.mockResolvedValue(refused(400, { error: { message: 'Unsupported delete request.', code: 100 } }));
    await expect(CONNECTORS.FACEBOOK.revoke?.(handle('FACEBOOK'), CREDS)).rejects.toThrow('Facebook: Unsupported delete request.');
  });

  it('Threads and LinkedIn have no revoke endpoint to call', () => {
    expect(CONNECTORS.THREADS.revoke).toBeUndefined();
    expect(CONNECTORS.LINKEDIN.revoke).toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
