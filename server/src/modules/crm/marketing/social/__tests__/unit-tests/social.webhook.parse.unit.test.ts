/**
 * Meta's webhook payloads turned into the DMs and comments the Inbox stores:
 * Instagram and Page objects, echoes of our own sends, postbacks, attachments,
 * and everything that must be dropped (reactions, read receipts, deleted
 * messages, the account's own comments, unknown objects).
 */
import { parseMetaWebhook, webhookTime } from '../../social.webhook.parse';

const IG = '17841400000000001';
const PAGE = '1000000000001';
const T = 1_764_000_000_000;

describe('parseMetaWebhook — Instagram', () => {
  it('reads an inbound DM with its text, attachments and time', () => {
    const events = parseMetaWebhook({
      object: 'instagram',
      entry: [
        {
          id: IG,
          time: T,
          messaging: [
            {
              sender: { id: 'igsid-1' },
              recipient: { id: IG },
              timestamp: T,
              message: { mid: 'm-1', text: 'What is the price?', attachments: [{ type: 'image', payload: { url: 'https://cdn/a.jpg' } }, { type: 'fallback' }] },
            },
          ],
        },
      ],
    });
    expect(events).toEqual([
      {
        kind: 'DM',
        platform: 'INSTAGRAM',
        account_external_id: IG,
        participant_id: 'igsid-1',
        direction: 'IN',
        external_id: 'm-1',
        text: 'What is the price?',
        attachments: [{ type: 'image', url: 'https://cdn/a.jpg' }],
        sent_at: new Date(T),
      },
    ]);
  });

  it('reads the echo of our own send as outbound, to the recipient', () => {
    const [event] = parseMetaWebhook({
      object: 'instagram',
      entry: [{ id: IG, messaging: [{ sender: { id: IG }, recipient: { id: 'igsid-1' }, timestamp: T, message: { mid: 'm-2', text: 'Hi!', is_echo: true } }] }],
    });
    expect(event).toMatchObject({ direction: 'OUT', participant_id: 'igsid-1', external_id: 'm-2' });
  });

  it('reads a postback as a message with its title, and drops reactions, reads, deleted and id-less messages', () => {
    const events = parseMetaWebhook({
      object: 'instagram',
      entry: [
        {
          id: IG,
          messaging: [
            { sender: { id: 'igsid-1' }, recipient: { id: IG }, timestamp: T, postback: { mid: 'pb-1', title: 'Book now', payload: 'BOOK' } },
            { sender: { id: 'igsid-1' }, recipient: { id: IG }, timestamp: T, reaction: { mid: 'm-1', action: 'react' } },
            { sender: { id: 'igsid-1' }, recipient: { id: IG }, timestamp: T, read: { mid: 'm-1' } },
            { sender: { id: 'igsid-1' }, recipient: { id: IG }, timestamp: T, message: { mid: 'm-3', is_deleted: true } },
            { sender: { id: 'igsid-1' }, recipient: { id: IG }, timestamp: T, message: { text: 'no id' } },
            { sender: {}, recipient: { id: IG }, timestamp: T, message: { mid: 'm-4', text: 'nobody' } },
          ],
        },
      ],
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: 'DM', external_id: 'pb-1', text: 'Book now', direction: 'IN' });
  });

  it('reads a comment on the account’s media, and drops the account’s own comment and one with no media', () => {
    const events = parseMetaWebhook({
      object: 'instagram',
      entry: [
        {
          id: IG,
          time: 1_764_000_000,
          changes: [
            { field: 'comments', value: { id: 'c-1', text: 'Love this', from: { id: 'u-1', username: 'asha' }, media: { id: 'media-1' } } },
            { field: 'comments', value: { id: 'c-2', text: 'Thanks!', from: { id: IG, username: 'duncit_app' }, media: { id: 'media-1' } } },
            { field: 'comments', value: { id: 'c-3', text: 'Orphan', from: { id: 'u-2' } } },
            { field: 'mentions', value: { media_id: 'm', comment_id: 'c' } },
          ],
        },
      ],
    });
    expect(events).toEqual([
      {
        kind: 'COMMENT',
        platform: 'INSTAGRAM',
        account_external_id: IG,
        external_id: 'c-1',
        post_external_id: 'media-1',
        text: 'Love this',
        author_id: 'u-1',
        author_name: 'asha',
        author_handle: 'asha',
        published_at: new Date(1_764_000_000 * 1000),
      },
    ]);
  });
});

describe('parseMetaWebhook — Page', () => {
  it('reads a Messenger DM and a new feed comment, never a removed one or the Page’s own', () => {
    const events = parseMetaWebhook({
      object: 'page',
      entry: [
        {
          id: PAGE,
          messaging: [{ sender: { id: 'psid-1' }, recipient: { id: PAGE }, timestamp: T, message: { mid: 'fm-1', text: 'Open today?' } }],
          changes: [
            { field: 'feed', value: { item: 'comment', verb: 'add', comment_id: 'fc-1', post_id: 'p_1', message: 'Nice', from: { id: 'u-9', name: 'Ravi' }, created_time: 1_764_000_100 } },
            { field: 'feed', value: { item: 'comment', verb: 'remove', comment_id: 'fc-2', post_id: 'p_1' } },
            { field: 'feed', value: { item: 'comment', verb: 'add', comment_id: 'fc-3', post_id: 'p_1', message: 'Us', from: { id: PAGE } } },
            { field: 'feed', value: { item: 'reaction', verb: 'add', post_id: 'p_1' } },
            { field: 'feed', value: { item: 'comment', verb: 'add', post_id: 'p_1' } },
          ],
        },
      ],
    });
    expect(events.map((e) => `${e.kind}:${e.platform}:${e.external_id}`)).toEqual(['DM:FACEBOOK:fm-1', 'COMMENT:FACEBOOK:fc-1']);
    expect(events[1]).toMatchObject({ author_name: 'Ravi', author_handle: '', post_external_id: 'p_1', published_at: new Date(1_764_000_100_000) });
  });
});

describe('parseMetaWebhook — anything else', () => {
  it('reads nothing from an unknown object, a prototype key, a missing entry list or an entry without an id', () => {
    expect(parseMetaWebhook({ object: 'whatsapp_business_account', entry: [{ id: '1', messaging: [] }] })).toEqual([]);
    expect(parseMetaWebhook({ object: 'constructor', entry: [{ id: '1' }] })).toEqual([]);
    expect(parseMetaWebhook({ object: 'instagram' })).toEqual([]);
    expect(parseMetaWebhook({ object: 'instagram', entry: [{ messaging: [{ sender: { id: 'x' }, message: { mid: 'm' } }] }] })).toEqual([]);
    expect(parseMetaWebhook(null)).toEqual([]);
    expect(parseMetaWebhook('text')).toEqual([]);
  });
});

describe('webhookTime', () => {
  it('reads milliseconds and seconds alike, and falls back for nothing usable', () => {
    const fallback = new Date(0);
    expect(webhookTime(T, fallback)).toEqual(new Date(T));
    expect(webhookTime(1_764_000_000, fallback)).toEqual(new Date(1_764_000_000_000));
    expect(webhookTime('1764000000', fallback)).toEqual(new Date(1_764_000_000_000));
    expect(webhookTime(undefined, fallback)).toBe(fallback);
    expect(webhookTime(-5, fallback)).toBe(fallback);
    expect(webhookTime('soon', fallback)).toBe(fallback);
  });
});
