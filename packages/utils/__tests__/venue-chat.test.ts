import { describe, expect, it } from 'vitest';
import {
  hasVenueChat,
  isVenueChatUnavailable,
  mergeVenueChatLines,
  venueChatCounterpart,
  venueChatPath,
  venueChatPodIdFromPath,
  type VenueChatLine,
  type VenueChatRoomInfo,
} from '../src/venue-chat';

const line = (id: string, at: string, text = id): VenueChatLine => ({
  id,
  user_id: 'u1',
  type: 'TEXT',
  text,
  deleted: false,
  createdAt: at,
});

describe('venueChatPath', () => {
  it('opens the thread of the pod, escaping the id', () => {
    expect(venueChatPath('6650a1')).toBe('/venue-chat/6650a1');
    expect(venueChatPath('a/b')).toBe('/venue-chat/a%2Fb');
  });
});

describe('venueChatPodIdFromPath', () => {
  it('reads the pod id back out of the path and the push link', () => {
    expect(venueChatPodIdFromPath('/venue-chat/6650a1')).toBe('6650a1');
    expect(venueChatPodIdFromPath('/venue-chat/6650a1?from=push#end')).toBe('6650a1');
    expect(venueChatPodIdFromPath(venueChatPath('a/b'))).toBe('a/b');
  });

  it('answers null for any other path, an empty thread path or a malformed escape', () => {
    expect(venueChatPodIdFromPath('/chats/6650a1')).toBeNull();
    expect(venueChatPodIdFromPath('/venue-chat/')).toBeNull();
    expect(venueChatPodIdFromPath('/x/venue-chat/6650a1')).toBeNull();
    expect(venueChatPodIdFromPath('/venue-chat/%E0%A4%A')).toBeNull();
    expect(venueChatPodIdFromPath('')).toBeNull();
    expect(venueChatPodIdFromPath(null)).toBeNull();
    expect(venueChatPodIdFromPath(undefined)).toBeNull();
  });
});

describe('hasVenueChat', () => {
  it('is true only for a pod booked at a venue', () => {
    expect(hasVenueChat({ venue_id: 'v1' })).toBe(true);
    expect(hasVenueChat({ venue_id: '' })).toBe(false);
    expect(hasVenueChat({ venue_id: null })).toBe(false);
    expect(hasVenueChat({})).toBe(false);
    expect(hasVenueChat(null)).toBe(false);
    expect(hasVenueChat(undefined)).toBe(false);
  });
});

describe('isVenueChatUnavailable', () => {
  it('treats only FORBIDDEN as "this thread is not yours"', () => {
    expect(isVenueChatUnavailable('FORBIDDEN')).toBe(true);
    expect(isVenueChatUnavailable('UNAUTHENTICATED')).toBe(false);
    expect(isVenueChatUnavailable('INTERNAL_SERVER_ERROR')).toBe(false);
    expect(isVenueChatUnavailable('')).toBe(false);
    expect(isVenueChatUnavailable(null)).toBe(false);
    expect(isVenueChatUnavailable(undefined)).toBe(false);
  });
});

describe('venueChatCounterpart', () => {
  const room: VenueChatRoomInfo = {
    pod_id: 'p1',
    pod_title: 'Sunday Run Club',
    pod_date_time: '2026-10-25T06:00:00.000Z',
    venue_id: 'v1',
    venue_name: 'Cubbon Courts',
    venue_photo: 'https://ik.imagekit.io/x/cover.jpg',
    my_side: 'HOST',
  };

  it('shows a host the venue, with the pod the thread is about', () => {
    expect(venueChatCounterpart(room)).toEqual({
      name: 'Cubbon Courts',
      photo: 'https://ik.imagekit.io/x/cover.jpg',
      podTitle: 'Sunday Run Club',
      when: '2026-10-25T06:00:00.000Z',
    });
  });

  it('shows the venue the pod itself, with no photo', () => {
    expect(venueChatCounterpart({ ...room, my_side: 'VENUE' })).toEqual({
      name: 'Sunday Run Club',
      photo: null,
      podTitle: null,
      when: '2026-10-25T06:00:00.000Z',
    });
  });

  it('turns a missing photo, title or time into null rather than an empty value', () => {
    expect(venueChatCounterpart({ ...room, venue_photo: '', pod_title: '', pod_date_time: undefined })).toEqual({
      name: 'Cubbon Courts',
      photo: null,
      podTitle: null,
      when: null,
    });
    expect(venueChatCounterpart({ ...room, venue_photo: null, pod_date_time: null }).photo).toBeNull();
  });
});

describe('mergeVenueChatLines', () => {
  it('keeps one copy of a line the socket echoes back after the send', () => {
    const sent = line('m2', '2026-10-21T10:01:00.000Z', 'Set up at 5?');
    const merged = mergeVenueChatLines([line('m1', '2026-10-21T10:00:00.000Z'), sent], [sent]);
    expect(merged.map((l) => l.id)).toEqual(['m1', 'm2']);
  });

  it('puts an older page in front of the lines on screen', () => {
    const merged = mergeVenueChatLines(
      [line('m3', '2026-10-21T10:03:00.000Z')],
      [line('m1', '2026-10-21T10:01:00.000Z'), line('m2', '2026-10-21T10:02:00.000Z')]
    );
    expect(merged.map((l) => l.id)).toEqual(['m1', 'm2', 'm3']);
  });

  it('takes the newer copy of a line that changed', () => {
    const merged = mergeVenueChatLines([line('m1', '2026-10-21T10:00:00.000Z', 'old')], [line('m1', '2026-10-21T10:00:00.000Z', 'new')]);
    expect(merged).toEqual([line('m1', '2026-10-21T10:00:00.000Z', 'new')]);
  });

  it('answers nothing for nothing', () => {
    expect(mergeVenueChatLines([], [])).toEqual([]);
  });
});
