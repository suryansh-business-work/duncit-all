import { describe, expect, it } from 'vitest';
import {
  CHAT_HISTORY_PAGE,
  CHAT_HISTORY_TRIGGER_PX,
  anchoredScrollTop,
  hasOlderPage,
  isNearHistoryTop,
  olderPageCursor,
} from '../src/chat-history';

describe('hasOlderPage', () => {
  it('expects more history after a full page and none after a short one', () => {
    expect(hasOlderPage(CHAT_HISTORY_PAGE)).toBe(true);
    expect(hasOlderPage(CHAT_HISTORY_PAGE - 1)).toBe(false);
    expect(hasOlderPage(0)).toBe(false);
  });

  it('reads the page size a surface asked for', () => {
    expect(hasOlderPage(80, 80)).toBe(true);
    expect(hasOlderPage(79, 80)).toBe(false);
  });
});

describe('olderPageCursor', () => {
  const lines = [
    { id: 'a', createdAt: '2026-10-19T10:00:00.000Z' },
    { id: 'b', createdAt: '2026-10-19T10:05:00.000Z' },
  ];

  it('pages from the oldest line loaded', () => {
    expect(olderPageCursor(lines, (line) => line.createdAt)).toBe('2026-10-19T10:00:00.000Z');
  });

  it('has no cursor for an empty room', () => {
    expect(olderPageCursor([], (line: { created_at: string }) => line.created_at)).toBeNull();
  });
});

describe('isNearHistoryTop', () => {
  it('loads once reading comes within the trigger distance of the top', () => {
    expect(isNearHistoryTop(0)).toBe(true);
    expect(isNearHistoryTop(CHAT_HISTORY_TRIGGER_PX)).toBe(true);
    expect(isNearHistoryTop(CHAT_HISTORY_TRIGGER_PX + 1)).toBe(false);
  });

  it('honours a surface-specific trigger', () => {
    expect(isNearHistoryTop(40, 40)).toBe(true);
    expect(isNearHistoryTop(41, 40)).toBe(false);
  });
});

describe('anchoredScrollTop', () => {
  it('moves down by exactly the height the older page added above the reader', () => {
    expect(anchoredScrollTop(10, 1000, 1600)).toBe(610);
  });

  it('stays put when the list did not grow', () => {
    expect(anchoredScrollTop(10, 1000, 1000)).toBe(10);
    expect(anchoredScrollTop(10, 1000, 900)).toBe(10);
  });
});
