import { describe, expect, it } from 'vitest';
import type { ChatMessage, ClubRoomData, PodRoomData } from '../chat.types';
import { clubPageInto, podPageInto, prependOlderPage, refreshNewestPage, roomCursor } from '../chatRoomPages';

const line = (id: string, minute: number, text = id): ChatMessage =>
  ({
    id,
    pod_id: 'pod1',
    user_id: 'u1',
    type: 'TEXT',
    text,
    reactions: [],
    deleted: false,
    createdAt: `2026-10-01T10:${String(minute).padStart(2, '0')}:00.000Z`,
  }) as ChatMessage;

describe('chat room pages', () => {
  it('puts an older page in front of the shown lines, each line once in its older place', () => {
    const shown = [line('c', 3), line('d', 4)];
    const older = [line('a', 1), line('b', 2), line('c', 3, 'c again')];
    expect(prependOlderPage(shown, older).map((m) => m.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(prependOlderPage(shown, older)[2].text).toBe('c again');
  });

  it('a refreshed newest page replaces the newest lines and keeps the older pages scrolled through', () => {
    const shown = [line('a', 1), line('b', 2), line('c', 3, 'old c')];
    const fresh = [line('c', 3, 'reacted c'), line('d', 4)];
    const merged = refreshNewestPage(shown, fresh);
    expect(merged.map((m) => m.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(merged[2].text).toBe('reacted c');
  });

  it('drops a line inside the newest window that the fresh page no longer has', () => {
    const shown = [line('a', 1), line('b', 2), line('gone', 3), line('c', 4)];
    const fresh = [line('b', 2), line('c', 4)];
    expect(refreshNewestPage(shown, fresh).map((m) => m.id)).toEqual(['a', 'b', 'c']);
  });

  it('an empty fresh page empties the room', () => {
    expect(refreshNewestPage([line('a', 1)], [])).toEqual([]);
  });

  it('the cursor is the oldest loaded line, or null for an empty room', () => {
    expect(roomCursor([line('a', 1), line('b', 2)])).toBe('2026-10-01T10:01:00.000Z');
    expect(roomCursor([])).toBeNull();
  });

  it('writes a lean older page into the room, keeping its fields; a full re-read refreshes them', () => {
    const podShown = { podMessages: [line('b', 2)], podChatInfo: { closed: false } } as PodRoomData;
    const lean = podPageInto(prependOlderPage)(podShown, { fetchMoreResult: { podMessages: [line('a', 1)] } });
    expect(lean.podMessages.map((m) => m.id)).toEqual(['a', 'b']);
    expect(lean.podChatInfo.closed).toBe(false);
    const podFetched = { podMessages: [line('b', 2)], podChatInfo: { closed: true } } as PodRoomData;
    const full = podPageInto(refreshNewestPage)(lean, { fetchMoreResult: podFetched });
    expect(full.podMessages.map((m) => m.id)).toEqual(['a', 'b']);
    expect(full.podChatInfo.closed).toBe(true);

    const clubShown = { clubMessages: [line('b', 2)] } as ClubRoomData;
    const club = clubPageInto(prependOlderPage)(clubShown, { fetchMoreResult: { clubMessages: [line('a', 1)] } });
    expect(club.clubMessages.map((m) => m.id)).toEqual(['a', 'b']);
  });
});
