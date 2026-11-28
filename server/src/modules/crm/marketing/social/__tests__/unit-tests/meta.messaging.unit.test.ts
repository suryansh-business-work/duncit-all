/**
 * Direct messages on Meta through the Page: which Page an account sends from,
 * the exact send body (RESPONSE vs the HUMAN_AGENT tag, a private reply to a
 * comment), the participant's profile, the conversation backfill, and the
 * Page's webhook subscription. The outbound fetch is faked.
 */
jest.mock('@utils/outboundFetch', () => ({ outboundFetch: jest.fn() }));

import { outboundFetch } from '@utils/outboundFetch';
import {
  PAGE_WEBHOOK_FIELDS,
  messagingPageOf,
  participantProfile,
  recentConversations,
  sendPageMessage,
  subscribePageWebhooks,
} from '../../providers/meta.messaging';
import type { SocialAccountHandle } from '../../social.types';

const mockFetch = outboundFetch as jest.Mock;
const GRAPH = 'https://graph.facebook.com/v23.0';
const CREDS = { clientId: 'app-1', clientSecret: 'shh', redirectUri: 'https://api.duncit.test/social/callback', version: 'v23.0' };

const reply = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body, headers: new Headers() });
const queue = (...bodies: unknown[]) => {
  for (const body of bodies) mockFetch.mockResolvedValueOnce(reply(body));
};
const urlOf = (call: number) => mockFetch.mock.calls[call][1] as string;
const formOf = (call: number) => Object.fromEntries(new URLSearchParams(String((mockFetch.mock.calls[call][2] as RequestInit).body)));
const queryOf = (call: number) => Object.fromEntries(new URL(urlOf(call)).searchParams);

const handle = (over: Partial<SocialAccountHandle>): SocialAccountHandle => ({
  provider: 'INSTAGRAM',
  platform: 'INSTAGRAM',
  external_id: 'ig-1',
  handle: 'duncit_app',
  access_token: 'PAGE-TOKEN',
  refresh_token: '',
  meta: { login: 'FACEBOOK', page_id: 'page-1' },
  ...over,
});
const instagram = handle({});
const facebook = handle({ platform: 'FACEBOOK', provider: 'FACEBOOK', external_id: 'page-1', meta: { login: 'FACEBOOK', instagram_id: 'ig-1' } });

beforeEach(() => mockFetch.mockReset());

describe('messagingPageOf', () => {
  it('sends from the Page itself, or from the Page an Instagram account is linked to', () => {
    expect(messagingPageOf(facebook)).toBe('page-1');
    expect(messagingPageOf(instagram)).toBe('page-1');
  });

  it('has no Page for an Instagram account without one, from the old Instagram Login, or on another network', () => {
    expect(messagingPageOf(handle({ meta: { login: 'FACEBOOK', page_id: '' } }))).toBeNull();
    expect(messagingPageOf(handle({ meta: {} }))).toBeNull();
    expect(messagingPageOf(handle({ platform: 'X', provider: 'X', meta: {} }))).toBeNull();
  });
});

describe('sendPageMessage', () => {
  it('posts a RESPONSE to the person through the Page and hands back Meta’s message id', async () => {
    queue({ message_id: 'mid.1', recipient_id: 'igsid-1' });
    await expect(sendPageMessage(instagram, { id: 'igsid-1' }, { text: 'Hello', messaging_type: 'RESPONSE', tag: '' }, CREDS)).resolves.toEqual({
      external_id: 'mid.1',
      recipient_id: 'igsid-1',
    });
    expect(urlOf(0)).toBe(`${GRAPH}/page-1/messages`);
    expect(formOf(0)).toEqual({
      recipient: '{"id":"igsid-1"}',
      message: '{"text":"Hello"}',
      messaging_type: 'RESPONSE',
      access_token: 'PAGE-TOKEN',
    });
  });

  it('adds the HUMAN_AGENT tag past 24 hours, and replies privately to a commenter by the comment', async () => {
    queue({}, { message_id: 'mid.3' });
    await expect(sendPageMessage(facebook, { id: 'psid-1' }, { text: 'Sorry', messaging_type: 'MESSAGE_TAG', tag: 'HUMAN_AGENT' }, CREDS)).resolves.toEqual({
      external_id: '',
      recipient_id: '',
    });
    expect(formOf(0)).toMatchObject({ messaging_type: 'MESSAGE_TAG', tag: 'HUMAN_AGENT' });
    await sendPageMessage(instagram, { comment_id: 'c-9' }, { text: 'DMing you', messaging_type: 'RESPONSE', tag: '' }, CREDS);
    expect(formOf(1).recipient).toBe('{"comment_id":"c-9"}');
  });

  it('refuses, without calling Meta, for an account with no Page to send from', async () => {
    await expect(sendPageMessage(handle({ meta: {} }), { id: 'x' }, { text: 'Hi', messaging_type: 'RESPONSE', tag: '' }, CREDS)).rejects.toThrow(
      'not linked to a Facebook Page'
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('participantProfile', () => {
  it('reads an Instagram person’s username, name and picture', async () => {
    queue({ name: 'Asha', username: 'asha.k', profile_pic: 'https://cdn/asha.jpg' });
    await expect(participantProfile(instagram, 'igsid-1', CREDS)).resolves.toEqual({ username: 'asha.k', name: 'Asha', avatar_url: 'https://cdn/asha.jpg' });
    expect(queryOf(0)).toEqual({ fields: 'name,username,profile_pic', access_token: 'PAGE-TOKEN' });
  });

  it('falls back to the username for a nameless Instagram person, and blanks when Meta says nothing', async () => {
    queue({ username: 'only.user' }, {});
    await expect(participantProfile(instagram, 'a', CREDS)).resolves.toEqual({ username: 'only.user', name: 'only.user', avatar_url: '' });
    await expect(participantProfile(instagram, 'b', CREDS)).resolves.toEqual({ username: '', name: '', avatar_url: '' });
  });

  it('reads a Messenger person’s first and last name', async () => {
    queue({ first_name: 'Ravi', last_name: 'Kumar', profile_pic: 'https://cdn/r.jpg' }, { first_name: 'Solo' });
    await expect(participantProfile(facebook, 'psid-1', CREDS)).resolves.toEqual({ username: '', name: 'Ravi Kumar', avatar_url: 'https://cdn/r.jpg' });
    expect(queryOf(0).fields).toBe('first_name,last_name,profile_pic');
    await expect(participantProfile(facebook, 'psid-2', CREDS)).resolves.toEqual({ username: '', name: 'Solo', avatar_url: '' });
  });
});

describe('recentConversations', () => {
  const since = new Date('2026-11-20T00:00:00Z');

  it('lists the Page’s Instagram conversations updated since the cursor, naming the other person and mapping each message', async () => {
    queue({
      data: [
        {
          id: 't-1',
          updated_time: '2026-11-23T10:00:00+0000',
          participants: { data: [{ id: 'ig-1', username: 'duncit_app' }, { id: 'igsid-1', username: 'asha.k' }] },
          messages: {
            data: [
              { id: 'm-2', message: 'Thanks', from: { id: 'ig-1' }, created_time: '2026-11-23T10:00:00+0000' },
              {
                id: 'm-1',
                message: '',
                from: { id: 'igsid-1' },
                created_time: '2026-11-23T09:00:00+0000',
                attachments: { data: [{ image_data: { url: 'https://cdn/i.jpg' } }, { video_data: { url: 'https://cdn/v.mp4' } }, { file_url: 'https://cdn/f.pdf', mime_type: 'application/pdf' }, {}] },
              },
            ],
          },
        },
        { id: 't-old', updated_time: '2026-11-01T00:00:00+0000', participants: { data: [{ id: 'igsid-2' }] } },
        { id: 't-self', updated_time: '2026-11-23T00:00:00+0000', participants: { data: [{ id: 'page-1' }, { id: 'ig-1' }] } },
      ],
    });
    const found = await recentConversations(instagram, since, CREDS);
    expect(urlOf(0).startsWith(`${GRAPH}/page-1/conversations?`)).toBe(true);
    expect(queryOf(0)).toMatchObject({ platform: 'instagram', limit: '50', access_token: 'PAGE-TOKEN' });
    expect(found).toHaveLength(1);
    expect(found[0].external_thread_id).toBe('t-1');
    expect(found[0].participant).toEqual({ id: 'igsid-1', username: 'asha.k' });
    expect(found[0].messages[0]).toEqual({ external_id: 'm-2', from_id: 'ig-1', text: 'Thanks', attachments: [], sent_at: new Date('2026-11-23T10:00:00Z') });
    expect(found[0].messages[1].attachments).toEqual([
      { type: 'image', url: 'https://cdn/i.jpg' },
      { type: 'video', url: 'https://cdn/v.mp4' },
      { type: 'application/pdf', url: 'https://cdn/f.pdf' },
    ]);
  });

  it('asks for Messenger conversations for a Page, and reads nothing for an account with no Page', async () => {
    queue({});
    await expect(recentConversations(facebook, since, CREDS)).resolves.toEqual([]);
    expect(queryOf(0).platform).toBe('messenger');
    await expect(recentConversations(handle({ meta: {} }), since, CREDS)).resolves.toEqual([]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('asks each platform only for the message fields it has, so a share, story reply or sticker is not stored blank', async () => {
    queue({}, {});
    await recentConversations(instagram, since, CREDS);
    await recentConversations(facebook, since, CREDS);
    expect(queryOf(0).fields).toBe('participants,updated_time,messages.limit(25){id,message,from,created_time,attachments,shares,story}');
    expect(queryOf(1).fields).toBe('participants,updated_time,messages.limit(25){id,message,from,created_time,attachments,shares,sticker}');
  });

  it('keeps what a textless message was: a shared post, a story reply or mention, a sticker', async () => {
    const message = (id: string, extra: Record<string, unknown>) => ({ id, message: '', from: { id: 'igsid-1' }, created_time: '2026-11-24T15:36:46+0000', ...extra });
    queue({
      data: [
        {
          id: 't-1',
          updated_time: '2026-11-24T15:37:35+0000',
          participants: { data: [{ id: 'igsid-1', username: 'duncit_app' }] },
          messages: {
            data: [
              message('m-1', { shares: { data: [{ link: 'https://instagram.com/p/abc' }, {}] } }),
              message('m-2', { story: { reply_to: { link: 'https://cdn/story.jpg' } } }),
              message('m-3', { story: { mention: { link: 'https://cdn/mention.jpg' } } }),
              message('m-4', { sticker: 'https://cdn/heart.png' }),
            ],
          },
        },
      ],
    });
    const [conversation] = await recentConversations(instagram, since, CREDS);
    expect(conversation.messages.map((m) => m.attachments)).toEqual([
      [{ type: 'share', url: 'https://instagram.com/p/abc' }],
      [{ type: 'story_reply', url: 'https://cdn/story.jpg' }],
      [{ type: 'story_mention', url: 'https://cdn/mention.jpg' }],
      [{ type: 'sticker', url: 'https://cdn/heart.png' }],
    ]);
  });

  it('follows the next page while its oldest conversation is still newer than the cursor, and stops once one is older', async () => {
    const convo = (id: string, updated: string) => ({ id, updated_time: updated, participants: { data: [{ id: `p-${id}` }] } });
    queue(
      { data: [convo('a', '2026-11-25T00:00:00+0000')], paging: { next: `${GRAPH}/page-1/conversations?after=1` } },
      { data: [convo('b', '2026-11-19T00:00:00+0000')], paging: { next: `${GRAPH}/page-1/conversations?after=2` } }
    );
    const found = await recentConversations(instagram, since, CREDS);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(urlOf(1)).toBe(`${GRAPH}/page-1/conversations?after=1`);
    expect(found.map((c) => c.external_thread_id)).toEqual(['a']);
  });

  it('reads at most five pages however far back the conversations go', async () => {
    const page = (n: number) => ({ data: [{ id: `c-${n}`, updated_time: '2026-11-26T00:00:00+0000', participants: { data: [{ id: `p-${n}` }] } }], paging: { next: `${GRAPH}/next-${n}` } });
    queue(page(1), page(2), page(3), page(4), page(5), page(6));
    const found = await recentConversations(instagram, since, CREDS);
    expect(mockFetch).toHaveBeenCalledTimes(5);
    expect(found).toHaveLength(5);
  });
});

describe('subscribePageWebhooks', () => {
  it('subscribes the Page to messages, postbacks, reactions, seen and feed with its own token', async () => {
    queue({ success: true });
    await subscribePageWebhooks('page-1', 'PAGE-TOKEN', CREDS);
    expect(urlOf(0)).toBe(`${GRAPH}/page-1/subscribed_apps`);
    expect(formOf(0)).toEqual({ subscribed_fields: PAGE_WEBHOOK_FIELDS.join(','), access_token: 'PAGE-TOKEN' });
    // Page field names only: Meta answered "(#100) Param subscribed_fields[3] must be one of …"
    // to the Instagram-only `messaging_seen` and subscribed the Page to nothing.
    expect(PAGE_WEBHOOK_FIELDS).toEqual(['messages', 'messaging_postbacks', 'message_reactions', 'feed']);
  });
});
