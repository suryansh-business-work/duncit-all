import { MANUAL_MARK_REASON, rentalRefundMoney, rentalRefundState, type RefundStateBooking } from '../../rentalRefundState';

/*
  Where a rental's refund stands, and the money in each bucket. The rule the
  whole feature rests on: a refund reads REFUNDED only when Razorpay confirmed
  it — never because someone typed a reference — and the amount owed never
  disappears from "outstanding" until it has.
*/

const base: RefundStateBooking = {
  status: 'RELEASED',
  deposit_amount: 0,
  refund_due: 100,
  refund_status: 'DUE',
  refund_ref: '',
  refunded_amount: 0,
  gateway_refund_id: null,
  refund_gateway_status: '',
  refund_review_reason: '',
};

describe('the two production rentals found by the 2026-11-22 audit', () => {
  it('reads the ₹1 Test Backout_pod1 refund marked PAID with reference "sd" as needing review, still outstanding', () => {
    // Booking 6b02a454fe77cbb04987e35d: rent 1, deposit 0, RELEASED by a filled Backout,
    // marked PAID by hand with "sd" — no gateway refund record behind it.
    const legacy: RefundStateBooking = {
      status: 'RELEASED',
      deposit_amount: 0,
      refund_due: 1,
      refund_status: 'PAID',
      refund_ref: 'sd',
      refunded_amount: undefined,
      gateway_refund_id: undefined,
      refund_gateway_status: undefined,
      refund_review_reason: undefined,
    };
    expect(rentalRefundMoney(legacy)).toEqual({
      state: 'REQUIRES_REVIEW',
      eligible: 1,
      pending: 0,
      refunded: 0,
      outstanding: 1,
      review_reason: MANUAL_MARK_REASON,
    });
  });

  it('reads the Chai, Chess & Chill rental (₹30 deposit handed back at the venue under the old rule) as owing nothing', () => {
    // Booking 6ad5bdc3d776daa198f0f435: RETURNED, auto-released, refund_due 0,
    // deposit_at_venue 30 and the deposit already paid to the venue in rel_mvz1lfpff37521e0.
    const old: RefundStateBooking = { ...base, status: 'RETURNED', deposit_amount: 30, refund_due: 0, refund_status: 'NONE' };
    expect(rentalRefundMoney(old)).toMatchObject({ state: 'NOT_ELIGIBLE', eligible: 0, outstanding: 0, refunded: 0 });
  });
});

describe('rentalRefundState', () => {
  it('waits for the item while it is out, when there is a deposit to give back', () => {
    expect(rentalRefundState({ ...base, status: 'BOOKED', deposit_amount: 300, refund_due: 0, refund_status: 'NONE' })).toBe(
      'AWAITING_RETURN'
    );
    expect(rentalRefundState({ ...base, status: 'BOOKED', deposit_amount: 0, refund_due: 0, refund_status: 'NONE' })).toBe(
      'NOT_ELIGIBLE'
    );
  });

  it('reads a cancelled pod’s rental as returned inside the booking’s own refund', () => {
    expect(rentalRefundState({ ...base, status: 'CANCELLED', refund_status: 'IN_PAYMENT' })).toBe('IN_PAYMENT');
  });

  it('is eligible once owed and not yet queued', () => {
    expect(rentalRefundState(base)).toBe('ELIGIBLE');
  });

  it.each([
    ['QUEUED', 'PROCESSING'],
    ['SENDING', 'PROCESSING'],
    ['PROCESSING', 'PROCESSING'],
    ['FAILED', 'FAILED'],
    ['RECONCILIATION_REQUIRED', 'REQUIRES_REVIEW'],
    ['NOT_APPLICABLE', 'REQUIRES_REVIEW'],
  ])('follows the Razorpay record: %s reads %s', (gateway, state) => {
    expect(rentalRefundState({ ...base, gateway_refund_id: 'r1', refund_gateway_status: gateway })).toBe(state);
  });

  it('reads REFUNDED only with a gateway record Razorpay marked processed', () => {
    expect(
      rentalRefundState({ ...base, refund_status: 'PAID', gateway_refund_id: 'r1', refund_gateway_status: 'SUCCEEDED', refunded_amount: 100 })
    ).toBe('REFUNDED');
    // PAID with a gateway record that never succeeded is not money anyone can vouch for.
    expect(rentalRefundState({ ...base, refund_status: 'PAID', gateway_refund_id: 'r1', refund_gateway_status: 'PROCESSING' })).toBe(
      'REQUIRES_REVIEW'
    );
  });

  it('holds a refund Finance must review, whatever the gateway says', () => {
    expect(rentalRefundState({ ...base, refund_review_reason: 'Over the captured amount' })).toBe('REQUIRES_REVIEW');
  });

  it('owes nothing on a closed booking with nothing due', () => {
    expect(rentalRefundState({ ...base, status: 'RETURNED', refund_due: 0, refund_status: 'NONE' })).toBe('NOT_ELIGIBLE');
  });
});

describe('rentalRefundMoney', () => {
  it('moves the amount from pending to refunded only on Razorpay’s confirmation', () => {
    const inFlight = rentalRefundMoney({ ...base, refund_due: 250.5, gateway_refund_id: 'r1', refund_gateway_status: 'PROCESSING' });
    expect(inFlight).toMatchObject({ eligible: 250.5, pending: 250.5, refunded: 0, outstanding: 250.5 });
    const done = rentalRefundMoney({
      ...base,
      refund_due: 250.5,
      refund_status: 'PAID',
      gateway_refund_id: 'r1',
      refund_gateway_status: 'SUCCEEDED',
      refunded_amount: 250.5,
    });
    expect(done).toMatchObject({ state: 'REFUNDED', pending: 0, refunded: 250.5, outstanding: 0 });
  });

  it('keeps a retrying refund pending and outstanding', () => {
    expect(rentalRefundMoney({ ...base, gateway_refund_id: 'r1', refund_gateway_status: 'FAILED' })).toMatchObject({
      state: 'FAILED',
      pending: 100,
      outstanding: 100,
    });
  });

  it('says why a held refund waits, and shows nothing outstanding for money returned with the booking', () => {
    expect(rentalRefundMoney({ ...base, refund_review_reason: 'No Razorpay payment' }).review_reason).toBe('No Razorpay payment');
    expect(rentalRefundMoney({ ...base, status: 'CANCELLED', refund_status: 'IN_PAYMENT' })).toMatchObject({
      eligible: 100,
      outstanding: 0,
    });
  });

  it('owes nothing back while an item is out, even with a deposit', () => {
    expect(rentalRefundMoney({ ...base, status: 'BOOKED', deposit_amount: 300, refund_due: 0, refund_status: 'NONE' })).toMatchObject({
      state: 'AWAITING_RETURN',
      eligible: 0,
      outstanding: 0,
    });
  });
});
