import { formatMessageTime } from '@/utils/chat';

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
