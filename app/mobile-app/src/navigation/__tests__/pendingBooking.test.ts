import {
  bookingIdFromPath,
  consumePendingBooking,
  rememberPendingBooking,
} from '@/navigation/pendingBooking';

describe('pendingBooking (native twin of mWeb ?redirect)', () => {
  afterEach(() => {
    consumePendingBooking();
  });

  it('reads the booking id from a booking path, with or without a leading slash', () => {
    expect(bookingIdFromPath('/booking/bk-1')).toBe('bk-1');
    expect(bookingIdFromPath('booking/bk-2')).toBe('bk-2');
  });

  it('decodes the id and ignores trailing query/hash segments', () => {
    expect(bookingIdFromPath('/booking/bk%2F3?from=email#top')).toBe('bk/3');
  });

  it('returns null for any other path', () => {
    expect(bookingIdFromPath('/pod-history/abc')).toBeNull();
    expect(bookingIdFromPath('/booking/')).toBeNull();
  });

  it('replays a parked booking id exactly once', () => {
    rememberPendingBooking('bk-9');
    expect(consumePendingBooking()).toBe('bk-9');
    expect(consumePendingBooking()).toBeNull();
  });
});
