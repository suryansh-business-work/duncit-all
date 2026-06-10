import { formatMessageTime, groupReactions } from '@/utils/chat';

describe('formatMessageTime', () => {
  it('returns empty for missing input', () => {
    expect(formatMessageTime()).toBe('');
    expect(formatMessageTime(null)).toBe('');
  });

  it('returns empty for an unparseable date', () => {
    expect(formatMessageTime('not-a-date')).toBe('');
  });

  it('formats a valid local timestamp as HH:mm', () => {
    expect(formatMessageTime('2026-06-09T08:05:00')).toBe('08:05');
  });
});

describe('groupReactions', () => {
  it('returns [] for nullish reactions', () => {
    expect(groupReactions()).toEqual([]);
    expect(groupReactions(null)).toEqual([]);
  });

  it('collapses duplicate emojis into counts', () => {
    const reactions = [
      { user_id: 'a', emoji: '👍' },
      { user_id: 'b', emoji: '👍' },
      { user_id: 'c', emoji: '❤️' },
    ] as never;
    expect(groupReactions(reactions)).toEqual([
      { emoji: '👍', count: 2 },
      { emoji: '❤️', count: 1 },
    ]);
  });
});
