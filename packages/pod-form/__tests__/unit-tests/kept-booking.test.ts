import { describe, expect, it } from 'vitest';
import { bookingKeyOf, keepsExistingBooking } from '../../src/kept-booking';
import { buildPodInput, podToFormValues } from '../../src/build-input';
import { blankPodFormValues } from '../../src/types';

const start = new Date('2027-03-01T10:00:00.000Z');
const end = new Date('2027-03-01T13:00:00.000Z');
const booked = { venue_id: 'venue-1', pod_date_time: start, pod_end_date_time: end };

describe('bookingKeyOf', () => {
  it('names the venue and the window, and an open end as empty', () => {
    expect(bookingKeyOf(booked)).toBe('venue-1|2027-03-01T10:00:00.000Z|2027-03-01T13:00:00.000Z');
    expect(bookingKeyOf({ venue_id: 'venue-1', pod_date_time: null, pod_end_date_time: null })).toBe('venue-1||');
  });
});

describe('keepsExistingBooking', () => {
  const kept = { ...booked, kept_booking: bookingKeyOf(booked), venue_offer_model: '', venue_offer_rate: '' };

  it('keeps the booking when an edit leaves the venue and window as they were', () => {
    expect(keepsExistingBooking(kept)).toBe(true);
  });

  it('makes it an offer again when the venue or the window changes', () => {
    expect(keepsExistingBooking({ ...kept, venue_id: 'venue-2' })).toBe(false);
    expect(keepsExistingBooking({ ...kept, pod_date_time: new Date('2027-03-02T10:00:00.000Z') })).toBe(false);
  });

  it('makes it an offer again once terms are typed', () => {
    expect(keepsExistingBooking({ ...kept, venue_offer_model: 'FLAT' })).toBe(false);
    expect(keepsExistingBooking({ ...kept, venue_offer_rate: '500' })).toBe(false);
  });

  it('never applies to a new pod', () => {
    expect(keepsExistingBooking({ ...kept, kept_booking: '' })).toBe(false);
  });
});

describe('an edit of a booked pod', () => {
  const pod = { pod_mode: 'PHYSICAL', venue_id: 'venue-1', pod_date_time: start.toISOString(), pod_end_date_time: end.toISOString() };

  it('remembers its booking when it opens, and none for a virtual pod or a pod with no date', () => {
    expect(podToFormValues(pod).kept_booking).toBe(bookingKeyOf(booked));
    expect(podToFormValues({ ...pod, pod_end_date_time: null }).kept_booking).toBe('venue-1|2027-03-01T10:00:00.000Z|');
    expect(podToFormValues({ ...pod, pod_mode: 'VIRTUAL' }).kept_booking).toBe('');
    expect(podToFormValues({ ...pod, pod_date_time: null }).kept_booking).toBe('');
    expect(podToFormValues({ ...pod, venue_id: null }).kept_booking).toBe('');
  });

  it('sends no venue change when the venue and window are kept, and an offer when they move', () => {
    const values = { ...blankPodFormValues, ...podToFormValues(pod) };
    const keptInput = buildPodInput(values, { draft: false, config: { showVenueSlot: true } as never });
    expect(keptInput).not.toHaveProperty('venue_offer');
    expect(keptInput).not.toHaveProperty('venue_slot_id');

    const moved = buildPodInput(
      { ...values, pod_date_time: new Date('2027-03-02T10:00:00.000Z'), venue_offer_model: 'FLAT', venue_offer_rate: '5000' },
      { draft: false, config: { showVenueSlot: true } as never },
    );
    expect(moved.venue_offer).toMatchObject({ model: 'FLAT', rate: 5000 });
  });
});
