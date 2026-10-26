import { describe, expect, it } from 'vitest';
import {
  RETURN_STATUSES,
  RETURN_STATUS_COLORS,
  pickupStateLabel,
  refundStatusLabel,
  returnStatusLabel,
} from './return-labels';

/** The label a key resolves to is whatever the catalogue says; the key itself shows which branch ran. */
const key = (k: string) => k;

describe('returnStatusLabel', () => {
  it.each([
    ['REQUESTED', 'partners.returns.status.requested'],
    ['APPROVED', 'partners.returns.status.approved'],
    ['PICKUP_SCHEDULED', 'partners.returns.status.pickupScheduled'],
    ['RECEIVED', 'partners.returns.status.received'],
    ['REFUNDED', 'partners.returns.status.refunded'],
    ['REJECTED', 'partners.returns.status.rejected'],
    ['CANCELLED', 'partners.returns.status.cancelled'],
  ] as const)('labels %s', (status, expected) => {
    expect(returnStatusLabel(key, status)).toBe(expected);
  });

  it('has a label and a chip colour for every status a filter offers', () => {
    expect(RETURN_STATUSES).toHaveLength(7);
    for (const status of RETURN_STATUSES) {
      expect(returnStatusLabel(key, status)).toMatch(/^partners\.returns\.status\./);
      expect(RETURN_STATUS_COLORS[status]).toBeTruthy();
    }
  });
});

describe('pickupStateLabel', () => {
  it.each([
    ['BOOKED', 'partners.returns.pickupState.booked'],
    ['PICKUP_SCHEDULED', 'partners.returns.pickupState.scheduled'],
    ['IN_TRANSIT', 'partners.returns.pickupState.inTransit'],
    ['DELIVERED', 'partners.returns.pickupState.delivered'],
    ['CANCELLED', 'partners.returns.pickupState.cancelled'],
    ['FAILED', 'partners.returns.pickupState.failed'],
    ['NONE', 'partners.returns.pickupState.none'],
  ] as const)('labels %s', (state, expected) => {
    expect(pickupStateLabel(key, state)).toBe(expected);
  });
});

describe('refundStatusLabel', () => {
  it.each([
    ['PENDING', 'partners.returns.refundState.pending'],
    ['PROCESSED', 'partners.returns.refundState.processed'],
    ['RECORDED', 'partners.returns.refundState.recorded'],
    ['FAILED', 'partners.returns.refundState.failed'],
    ['NONE', 'partners.returns.refundState.none'],
  ] as const)('labels %s', (status, expected) => {
    expect(refundStatusLabel(key, status)).toBe(expected);
  });
});
