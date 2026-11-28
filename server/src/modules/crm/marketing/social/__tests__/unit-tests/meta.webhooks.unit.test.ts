/**
 * The Meta app's own webhook registration: what `/{app-id}/subscriptions`
 * reports, read into plain rows, and the exact registration sent for each
 * object, both asked with the app token. The outbound fetch is faked.
 */
jest.mock('@utils/outboundFetch', () => ({ outboundFetch: jest.fn() }));

import { outboundFetch } from '@utils/outboundFetch';
import { APP_WEBHOOK_FIELDS, appSubscriptions, registerAppSubscription } from '../../providers/meta.webhooks';

const mockFetch = outboundFetch as jest.Mock;
const APP = { clientId: '2706', clientSecret: 'shh', version: 'v23.0' };
const reply = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body, headers: new Headers() });
const urlOf = (call: number) => new URL(mockFetch.mock.calls[call][1] as string);
const formOf = (call: number) => Object.fromEntries(new URLSearchParams(String((mockFetch.mock.calls[call][2] as RequestInit).body)));

beforeEach(() => mockFetch.mockReset());

describe('appSubscriptions', () => {
  it('reads each object’s callback, state and field names with the app token', async () => {
    mockFetch.mockResolvedValueOnce(
      reply({
        data: [
          { object: 'page', callback_url: 'https://server/social/webhook', active: true, fields: [{ name: 'messages', version: 'v23.0' }, { name: 'feed' }, {}] },
          { object: 'instagram', fields: ['comments'] },
          {},
        ],
      })
    );
    await expect(appSubscriptions(APP)).resolves.toEqual([
      { object: 'page', callback_url: 'https://server/social/webhook', active: true, fields: ['messages', 'feed'] },
      { object: 'instagram', callback_url: '', active: false, fields: ['comments'] },
      { object: '', callback_url: '', active: false, fields: [] },
    ]);
    const url = urlOf(0);
    expect(url.pathname).toBe('/v23.0/2706/subscriptions');
    expect(url.searchParams.get('access_token')).toBe('2706|shh');
  });

  it('reads an app with nothing registered as no rows, and passes on Meta’s refusal', async () => {
    mockFetch.mockResolvedValueOnce(reply({})).mockResolvedValueOnce(reply({ error: { message: 'Invalid OAuth access token', code: 190 } }, 400));
    await expect(appSubscriptions(APP)).resolves.toEqual([]);
    await expect(appSubscriptions(APP)).rejects.toThrow('Invalid OAuth access token');
  });
});

describe('registerAppSubscription', () => {
  it('posts the object, our callback, only the fields the Inbox reads and the verify token', async () => {
    mockFetch.mockResolvedValue(reply({ success: true }));
    await registerAppSubscription(APP, 'instagram', 'https://server/social/webhook', 'tok');
    await registerAppSubscription(APP, 'page', 'https://server/social/webhook', 'tok');
    expect(urlOf(0).pathname).toBe('/v23.0/2706/subscriptions');
    expect(formOf(0)).toEqual({
      object: 'instagram',
      callback_url: 'https://server/social/webhook',
      fields: 'messages,messaging_postbacks,message_reactions,comments,live_comments',
      verify_token: 'tok',
      include_values: 'true',
      access_token: '2706|shh',
    });
    expect(formOf(1).fields).toBe(APP_WEBHOOK_FIELDS.page.join(','));
    // Page field names only: Meta refuses a whole registration over one it does not know.
    expect(APP_WEBHOOK_FIELDS.page).toEqual(['messages', 'messaging_postbacks', 'message_reactions', 'feed']);
  });
});
