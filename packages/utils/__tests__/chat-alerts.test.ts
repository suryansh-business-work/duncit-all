import { describe, expect, it } from 'vitest';
import {
  CHAT_REPLY_PREVIEW_MAX,
  chatMuteCopy,
  chatNewToastLine,
  chatReplyPreview,
  chatReplyText,
  chatRoomFromPath,
  createChatPingGate,
  formatUnreadBadge,
  isChatMuted,
  isViewingRoom,
  parseChatNewFrame,
} from '../src/chat-alerts';

const frame = {
  room_kind: 'POD',
  room_id: 'p1',
  message_id: 'm1',
  title: 'Sunday run',
  sender_name: 'Asha',
  preview: 'see you there',
  type: 'TEXT',
  mentioned: false,
};

const t = (key: string) => `[${key}]`;

describe('parseChatNewFrame', () => {
  it('reads a well-formed frame', () => {
    expect(parseChatNewFrame(frame)).toEqual(frame);
  });

  it('rejects frames for other room kinds or without ids', () => {
    expect(parseChatNewFrame({ ...frame, room_kind: 'SUPPORT' })).toBeNull();
    expect(parseChatNewFrame({ ...frame, room_id: '' })).toBeNull();
    expect(parseChatNewFrame({ ...frame, message_id: 7 })).toBeNull();
    expect(parseChatNewFrame(null)).toBeNull();
    expect(parseChatNewFrame('chat:new')).toBeNull();
  });

  it('defaults the optional fields rather than passing junk through', () => {
    const parsed = parseChatNewFrame({ room_kind: 'CLUB', room_id: 'c1', message_id: 'm2', mentioned: 'yes' });
    expect(parsed).toEqual({
      room_kind: 'CLUB',
      room_id: 'c1',
      message_id: 'm2',
      title: '',
      sender_name: '',
      preview: '',
      type: 'TEXT',
      mentioned: false,
    });
  });
});

describe('isViewingRoom / chatRoomFromPath', () => {
  const parsed = parseChatNewFrame(frame)!;

  it('knows when the frame is for the open room', () => {
    expect(isViewingRoom({ kind: 'POD', id: 'p1' }, parsed)).toBe(true);
    expect(isViewingRoom({ kind: 'CLUB', id: 'p1' }, parsed)).toBe(false);
    expect(isViewingRoom(null, parsed)).toBe(false);
  });

  it('reads the open room off mWeb paths', () => {
    expect(chatRoomFromPath('/chats/p1')).toEqual({ kind: 'POD', id: 'p1' });
    expect(chatRoomFromPath('/chats/club/c1?x=1')).toEqual({ kind: 'CLUB', id: 'c1' });
    expect(chatRoomFromPath('/chats')).toBeNull();
    expect(chatRoomFromPath('/chats/club')).toBeNull();
    expect(chatRoomFromPath('/home')).toBeNull();
    expect(chatRoomFromPath(undefined)).toBeNull();
  });
});

describe('createChatPingGate', () => {
  it('pings once for a burst and again after the window', () => {
    let now = 1000;
    const gate = createChatPingGate(3000, () => now);
    expect(gate('a')).toBe(true);
    now = 2000;
    expect(gate('b')).toBe(false);
    now = 3999;
    expect(gate('c')).toBe(false);
    now = 4000;
    expect(gate('d')).toBe(true);
  });

  it('never pings twice for the same message id', () => {
    let now = 0;
    const gate = createChatPingGate(10, () => now);
    expect(gate('a')).toBe(true);
    now = 100;
    expect(gate('a')).toBe(false);
  });
});

describe('isChatMuted', () => {
  const now = Date.parse('2026-10-19T10:00:00Z');

  it('treats a mute with no end as forever', () => {
    expect(isChatMuted({ is_muted: true, muted_until: null }, now)).toBe(true);
  });

  it('ends a timed mute at its end', () => {
    expect(isChatMuted({ is_muted: true, muted_until: '2026-10-19T11:00:00Z' }, now)).toBe(true);
    expect(isChatMuted({ is_muted: true, muted_until: '2026-10-19T09:00:00Z' }, now)).toBe(false);
  });

  it('is off when nothing says muted', () => {
    expect(isChatMuted({ is_muted: false, muted_until: '2026-10-19T11:00:00Z' }, now)).toBe(false);
    expect(isChatMuted(null, now)).toBe(false);
  });
});

describe('formatUnreadBadge', () => {
  it('hides zero and caps large counts', () => {
    expect(formatUnreadBadge(0)).toBe('');
    expect(formatUnreadBadge(null)).toBe('');
    expect(formatUnreadBadge(-3)).toBe('');
    expect(formatUnreadBadge(7)).toBe('7');
    expect(formatUnreadBadge(99)).toBe('99');
    expect(formatUnreadBadge(100)).toBe('99+');
  });
});

describe('chatReplyPreview / chatReplyText', () => {
  it('names a deleted, photo or sticker line instead of quoting it', () => {
    expect(chatReplyPreview({ id: '1', deleted: true, text: 'x' })).toEqual({ kind: 'DELETED' });
    expect(chatReplyPreview({ id: '1', type: 'IMAGE' })).toEqual({ kind: 'IMAGE' });
    expect(chatReplyPreview({ id: '1', type: 'STICKER', text: '' })).toEqual({ kind: 'STICKER' });
    expect(chatReplyText({ id: '1', deleted: true }, t)).toBe('[mweb.chatRoom.reply.deleted]');
    expect(chatReplyText({ id: '1', type: 'IMAGE' }, t)).toBe('[mweb.chatRoom.image]');
    expect(chatReplyText({ id: '1', type: 'STICKER' }, t)).toBe('[mweb.chatRoom.reply.sticker]');
  });

  it('collapses whitespace and cuts a long quote with an ellipsis', () => {
    expect(chatReplyText({ id: '1', text: 'a\n\n b' }, t)).toBe('a b');
    const long = 'x'.repeat(CHAT_REPLY_PREVIEW_MAX + 10);
    const preview = chatReplyPreview({ id: '1', text: long });
    expect(preview.kind === 'TEXT' && preview.text.length).toBe(CHAT_REPLY_PREVIEW_MAX);
    expect(preview.kind === 'TEXT' && preview.text.endsWith('…')).toBe(true);
  });
});

describe('chatNewToastLine / chatMuteCopy', () => {
  it('prefixes the sender and words a photo in the reader language', () => {
    const parsed = parseChatNewFrame(frame)!;
    expect(chatNewToastLine(parsed, t)).toBe('Asha: see you there');
    expect(chatNewToastLine({ ...parsed, type: 'IMAGE', preview: '' }, t)).toBe('Asha: [mweb.chatRoom.image]');
    expect(chatNewToastLine({ ...parsed, sender_name: '' }, t)).toBe('see you there');
  });

  it('labels every mute option', () => {
    const copy = chatMuteCopy(t);
    expect(copy.options).toEqual({
      EIGHT_HOURS: '[mweb.chatRoom.mute.eightHours]',
      ONE_WEEK: '[mweb.chatRoom.mute.oneWeek]',
      ALWAYS: '[mweb.chatRoom.mute.always]',
    });
    expect(copy.unmute).toBe('[mweb.chatRoom.mute.unmute]');
  });
});
