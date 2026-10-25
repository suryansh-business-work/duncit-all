import { describe, expect, it } from 'vitest';
import {
  VENUE_CHAT_MESSAGES_SDL,
  VENUE_CHAT_ROOM_SDL,
  hasVenueChat,
  isVenueChatUnavailable,
  mergeVenueChatLines,
  newestOfferLineId,
  venueChatCounterpart,
  venueChatOfferActions,
  venueChatOfferTitleKey,
  venueChatPath,
  venueChatPodIdFromPath,
  type VenueChatLine,
  type VenueChatOfferMove,
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
      contact: null,
    });
  });

  it('shows the venue the pod itself, with no photo', () => {
    expect(venueChatCounterpart({ ...room, my_side: 'VENUE' })).toEqual({
      name: 'Sunday Run Club',
      photo: null,
      podTitle: null,
      when: '2026-10-25T06:00:00.000Z',
      contact: null,
    });
  });

  it('turns a missing photo, title or time into null rather than an empty value', () => {
    expect(venueChatCounterpart({ ...room, venue_photo: '', pod_title: '', pod_date_time: undefined })).toEqual({
      name: 'Cubbon Courts',
      photo: null,
      podTitle: null,
      when: null,
      contact: null,
    });
    expect(venueChatCounterpart({ ...room, venue_photo: null, pod_date_time: null }).photo).toBeNull();
  });

  it("gives either side the other's phone and email, trimmed", () => {
    const withContact = { ...room, counterpart_name: ' Asha ', counterpart_phone: '+91 98450 00000 ', counterpart_email: 'desk@cubbon.in' };
    expect(venueChatCounterpart(withContact).contact).toEqual({ name: 'Asha', phone: '+91 98450 00000', email: 'desk@cubbon.in' });
    expect(venueChatCounterpart({ ...withContact, my_side: 'VENUE' }).contact).toEqual({
      name: 'Asha',
      phone: '+91 98450 00000',
      email: 'desk@cubbon.in',
    });
  });

  it('keeps a contact with only one way to reach them, and drops one with none', () => {
    expect(venueChatCounterpart({ ...room, counterpart_phone: '+91 98450 00000' }).contact).toEqual({
      name: null,
      phone: '+91 98450 00000',
      email: null,
    });
    expect(venueChatCounterpart({ ...room, counterpart_name: 'Asha', counterpart_email: 'desk@cubbon.in', counterpart_phone: '  ' }).contact).toEqual({
      name: 'Asha',
      phone: null,
      email: 'desk@cubbon.in',
    });
    expect(venueChatCounterpart({ ...room, counterpart_name: 'Asha', counterpart_phone: '', counterpart_email: null }).contact).toBeNull();
  });
});

describe('offer lines', () => {
  const move = (over: Partial<VenueChatOfferMove> = {}): VenueChatOfferMove => ({
    slot_id: 's1',
    round: 2,
    event: 'COUNTER',
    by: 'VENUE',
    model: 'PER_GUEST',
    rate: 500,
    min_guests: 6,
    max_guests: 20,
    offerings: ['Projector'],
    note: '',
    start_at: '2026-11-07T07:30:00.000Z',
    end_at: '2026-11-07T09:30:00.000Z',
    space_label: '',
    pets: false,
    venue_receives_min: 3000,
    venue_receives_max: 10000,
    total_min: 3540,
    total_max: 11800,
    expires_at: '2026-11-06T07:30:00.000Z',
    reason: '',
    ...over,
  });
  const offerLine = (id: string, at: string, over: Partial<VenueChatOfferMove> = {}): VenueChatLine => ({
    ...line(id, at),
    type: 'OFFER',
    offer: move(over),
  });

  it('selects the move on every line and the contact on the room', () => {
    for (const field of ['offer {', 'venue_receives_max', 'offerings', 'expires_at', 'reason']) {
      expect(VENUE_CHAT_MESSAGES_SDL).toContain(field);
    }
    for (const field of ['pod_is_free', 'counterpart_name', 'counterpart_phone', 'counterpart_email']) expect(VENUE_CHAT_ROOM_SDL).toContain(field);
  });

  it('finds the newest offer line, skipping text after it and an OFFER line with no move', () => {
    const lines = [
      offerLine('o1', '2026-10-21T10:00:00.000Z', { round: 1, event: 'OFFER', by: 'HOST' }),
      offerLine('o2', '2026-10-21T10:01:00.000Z'),
      { ...line('o3', '2026-10-21T10:02:00.000Z'), type: 'OFFER', offer: null },
      line('t1', '2026-10-21T10:03:00.000Z'),
    ];
    expect(newestOfferLineId(lines)).toBe('o2');
    expect(newestOfferLineId([line('t1', '2026-10-21T10:03:00.000Z')])).toBeNull();
    expect(newestOfferLineId([])).toBeNull();
  });

  describe('venueChatOfferActions', () => {
    const live = { round: 2, status: 'COUNTERED', awaiting: 'HOST' };

    it('lets the side whose turn it is answer the newest open move of the live round', () => {
      expect(venueChatOfferActions(move(), { side: 'HOST', newest: true, live })).toEqual({ answer: true, sendNew: false });
      const hostOffer = move({ round: 1, event: 'OFFER', by: 'HOST' });
      expect(venueChatOfferActions(hostOffer, { side: 'VENUE', newest: true, live: { round: 1, status: 'SENT', awaiting: 'VENUE' } })).toEqual({
        answer: true,
        sendNew: false,
      });
    });

    it('offers nothing to the side that just moved, on an older line, or on a round the live offer moved past', () => {
      expect(venueChatOfferActions(move(), { side: 'VENUE', newest: true, live })).toEqual({ answer: false, sendNew: false });
      expect(venueChatOfferActions(move(), { side: 'HOST', newest: false, live })).toEqual({ answer: false, sendNew: false });
      expect(venueChatOfferActions(move(), { side: 'HOST', newest: true, live: { ...live, round: 3 } })).toEqual({
        answer: false,
        sendNew: false,
      });
    });

    it('offers nothing once the live offer closed or is gone, or on an accepted line', () => {
      expect(venueChatOfferActions(move(), { side: 'HOST', newest: true, live: { ...live, status: 'ACCEPTED' } })).toEqual({
        answer: false,
        sendNew: false,
      });
      expect(venueChatOfferActions(move(), { side: 'HOST', newest: true, live: null })).toEqual({ answer: false, sendNew: false });
      expect(venueChatOfferActions(move({ event: 'ACCEPTED' }), { side: 'HOST', newest: true, live })).toEqual({
        answer: false,
        sendNew: false,
      });
    });

    it('lets only the host send a new offer, from the newest line that declined or ran out', () => {
      for (const event of ['DECLINED', 'EXPIRED']) {
        expect(venueChatOfferActions(move({ event }), { side: 'HOST', newest: true, live: null })).toEqual({ answer: false, sendNew: true });
        expect(venueChatOfferActions(move({ event }), { side: 'VENUE', newest: true, live: null })).toEqual({ answer: false, sendNew: false });
        expect(venueChatOfferActions(move({ event }), { side: 'HOST', newest: false, live: null })).toEqual({ answer: false, sendNew: false });
      }
    });
  });

  describe('venueChatOfferTitleKey', () => {
    it('names a move as its mover reads it, and as the other side does', () => {
      const hostOffer = move({ event: 'OFFER', by: 'HOST' });
      expect(venueChatOfferTitleKey(hostOffer, 'HOST')).toBe('availability.offers.chat.title.youOffered');
      expect(venueChatOfferTitleKey(hostOffer, 'VENUE')).toBe('availability.offers.chat.title.hostOffered');
      expect(venueChatOfferTitleKey(move(), 'VENUE')).toBe('availability.offers.chat.title.youCountered');
      expect(venueChatOfferTitleKey(move(), 'HOST')).toBe('availability.offers.chat.title.venueCountered');
      expect(venueChatOfferTitleKey(move({ by: 'HOST' }), 'VENUE')).toBe('availability.offers.chat.title.hostCountered');
      expect(venueChatOfferTitleKey(move({ event: 'ACCEPTED', by: 'HOST' }), 'VENUE')).toBe('availability.offers.chat.title.hostAccepted');
      expect(venueChatOfferTitleKey(move({ event: 'ACCEPTED', by: 'VENUE' }), 'HOST')).toBe('availability.offers.chat.title.venueAccepted');
      expect(venueChatOfferTitleKey(move({ event: 'DECLINED', by: 'HOST' }), 'VENUE')).toBe('availability.offers.chat.title.hostDeclined');
      expect(venueChatOfferTitleKey(move({ event: 'DECLINED', by: 'VENUE' }), 'HOST')).toBe('availability.offers.chat.title.venueDeclined');
      expect(venueChatOfferTitleKey(move({ event: 'DECLINED', by: 'VENUE' }), 'VENUE')).toBe('availability.offers.chat.title.youDeclined');
    });

    it('names an expired offer the same for both sides, and nothing for a move this client does not know', () => {
      expect(venueChatOfferTitleKey(move({ event: 'EXPIRED', by: 'SYSTEM' }), 'HOST')).toBe('availability.offers.chat.title.expired');
      expect(venueChatOfferTitleKey(move({ event: 'EXPIRED', by: 'SYSTEM' }), 'VENUE')).toBe('availability.offers.chat.title.expired');
      expect(venueChatOfferTitleKey(move({ event: 'OFFER', by: 'VENUE' }), 'HOST')).toBe('');
      expect(venueChatOfferTitleKey(move({ event: 'WITHDRAWN' }), 'HOST')).toBe('');
    });
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
