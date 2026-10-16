import { describe, expect, it } from 'vitest';
import {
  CHAT_PREVIEW_PAGE,
  chatPreviewAction,
  chatRoomPath,
  hasEarlierMessages,
  mergeEarlierMessages,
} from '../src/chat-preview';

describe('chatPreviewAction', () => {
  it('opens the room for a member of a pod or a club', () => {
    expect(chatPreviewAction('POD', true)).toBe('OPEN');
    expect(chatPreviewAction('CLUB', true)).toBe('OPEN');
  });

  it('asks a club visitor to join the club, and a pod visitor to book a spot', () => {
    expect(chatPreviewAction('CLUB', false)).toBe('JOIN_CLUB');
    expect(chatPreviewAction('POD', false)).toBe('BOOK_POD');
  });
});

describe('chatRoomPath', () => {
  it('points a pod at /chats/<id> and a club at /chats/club/<id>', () => {
    expect(chatRoomPath('POD', 'p1')).toBe('/chats/p1');
    expect(chatRoomPath('CLUB', 'c1')).toBe('/chats/club/c1');
  });
});

describe('hasEarlierMessages', () => {
  it('is true only while fewer lines are loaded than the room holds', () => {
    expect(hasEarlierMessages(50, 120)).toBe(true);
    expect(hasEarlierMessages(120, 120)).toBe(false);
    expect(hasEarlierMessages(0, 0)).toBe(false);
  });
});

describe('mergeEarlierMessages', () => {
  it('puts the older page in front, oldest first', () => {
    expect(mergeEarlierMessages([{ id: 'a' }, { id: 'b' }], [{ id: 'c' }]).map((m) => m.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('keeps a line that arrived on both pages once, in its older place', () => {
    const merged = mergeEarlierMessages(
      [{ id: 'a', text: 'older copy' }, { id: 'b', text: 'b' }],
      [{ id: 'b', text: 'b' }, { id: 'c', text: 'c' }],
    );
    expect(merged.map((m) => m.id)).toEqual(['a', 'b', 'c']);
  });

  it('returns the current lines when there is no older page', () => {
    expect(mergeEarlierMessages([], [{ id: 'x' }])).toEqual([{ id: 'x' }]);
  });
});

describe('CHAT_PREVIEW_PAGE', () => {
  it('loads fifty lines a page', () => {
    expect(CHAT_PREVIEW_PAGE).toBe(50);
  });
});
