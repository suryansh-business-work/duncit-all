import { describe, expect, it } from 'vitest';
import { RENTAL_REFUND_STATES, rentalGuestRefundLine } from '../src/venue-rentals-refunds';

/** A closed rental of a ₹500-deposit item, as a current server sends it. */
const row = (over: Record<string, unknown> = {}) => ({
  status: 'RETURNED',
  deposit_amount: 500,
  refund_due: 500,
  refund_status: 'DUE',
  damage_claim: 0,
  refund_state: null as string | null,
  refunded_amount: null as number | null,
  refund_outstanding: null as number | null,
  ...over,
});

describe('rentalGuestRefundLine', () => {
  it('says refunded only once Razorpay confirmed it, naming what Razorpay processed', () => {
    expect(rentalGuestRefundLine(row({ refund_state: 'REFUNDED', refund_status: 'PAID', refunded_amount: 300, refund_due: 300 }))).toEqual({
      key: 'venueRentals.guest.refunded',
      amount: 300,
    });
    // A confirmed refund the server sent no processed amount for reads the amount owed.
    expect(rentalGuestRefundLine(row({ refund_state: 'REFUNDED', refunded_amount: 0, refund_due: 450 }))).toEqual({
      key: 'venueRentals.guest.refunded',
      amount: 450,
    });
  });

  it('says refunded for a rental carried by the pod cancellation’s own refund', () => {
    expect(rentalGuestRefundLine(row({ status: 'CANCELLED', refund_state: 'IN_PAYMENT', refund_status: 'IN_PAYMENT', refund_due: 800 }))).toEqual({
      key: 'venueRentals.guest.refunded',
      amount: 800,
    });
  });

  it('says processing — never refunded — while the refund is owed, queued, in flight or retrying', () => {
    for (const state of ['ELIGIBLE', 'PROCESSING', 'FAILED']) {
      expect(rentalGuestRefundLine(row({ refund_state: state, refund_outstanding: 500 }))).toEqual({
        key: 'venueRentals.guest.refundProcessing',
        amount: 500,
      });
    }
    // An older server sends no outstanding amount: the amount owed stands in.
    expect(rentalGuestRefundLine(row({ refund_state: 'PROCESSING', refund_due: 320 }))?.amount).toBe(320);
  });

  it('says under review for a refund waiting on Finance', () => {
    expect(rentalGuestRefundLine(row({ refund_state: 'REQUIRES_REVIEW', refund_status: 'PAID', refund_outstanding: 250, refund_due: 250 }))).toEqual({
      key: 'venueRentals.guest.refundReview',
      amount: 250,
    });
  });

  it('reads a legacy hand-marked "paid" refund as under review, not refunded', () => {
    expect(rentalGuestRefundLine(row({ refund_status: 'PAID', refund_due: 500 }))).toEqual({
      key: 'venueRentals.guest.refundReview',
      amount: 500,
    });
  });

  it('says the deposit comes back after return while the item is out', () => {
    expect(rentalGuestRefundLine(row({ status: 'BOOKED', refund_state: 'AWAITING_RETURN', refund_due: 0, refund_status: 'NONE' }))).toEqual({
      key: 'venueRentals.guest.depositBack',
      amount: 500,
    });
    // An item out with no deposit has nothing to come back.
    expect(rentalGuestRefundLine(row({ status: 'BOOKED', deposit_amount: 0, refund_due: 0, refund_status: 'NONE' }))).toBeNull();
  });

  it('says nothing when no refund is owed, unless part of the deposit was kept for damage', () => {
    expect(rentalGuestRefundLine(row({ refund_state: 'NOT_ELIGIBLE', refund_due: 0, refund_status: 'NONE' }))).toBeNull();
    expect(
      rentalGuestRefundLine(row({ status: 'DAMAGED', refund_state: 'NOT_ELIGIBLE', refund_due: 0, refund_status: 'NONE', damage_claim: 500 }))
    ).toEqual({ key: 'venueRentals.guest.damageKept', amount: 500 });
  });

  it('never prints a refund of nothing: a zero amount falls back to the damage kept, or nothing', () => {
    expect(rentalGuestRefundLine(row({ refund_state: 'IN_PAYMENT', refund_status: 'IN_PAYMENT', refund_due: 0 }))).toBeNull();
    expect(rentalGuestRefundLine(row({ refund_state: 'PROCESSING', refund_due: 0, damage_claim: 120 }))).toEqual({
      key: 'venueRentals.guest.damageKept',
      amount: 120,
    });
  });

  it('answers every refund state with a guest line key or nothing — no raw state leaks through', () => {
    for (const state of RENTAL_REFUND_STATES) {
      const line = rentalGuestRefundLine(row({ refund_state: state, damage_claim: 100, refund_outstanding: 400 }));
      expect(line === null || line.key.startsWith('venueRentals.guest.')).toBe(true);
    }
  });
});
