import { describe, expect, it } from 'vitest';
import {
  rentalActorKey,
  rentalEventKey,
  rentalGatewayStatusKey,
  rentalPodPath,
  rentalRefundSourceKey,
} from '../src/venue-rentals-refunds';

/*
  The rental detail view labels what the SERVER sends: timeline steps, who
  acted, the Razorpay record's status and which refund carried the money. Each
  known value must reach its own copy key; a value a newer server adds must
  fall back to a neutral label instead of printing a raw key or "undefined".
*/

const TIMELINE = [
  'BOOKED',
  'UNAVAILABLE',
  'CANCELLED',
  'RELEASED',
  'RETURNED',
  'DAMAGED',
  'AUTO_RELEASED',
  'RESTORED',
  'REFUND_QUEUED',
  'REFUND_PROCESSING',
  'REFUND_SUCCEEDED',
  'REFUND_FAILED',
  'REFUND_REVIEW',
  'FINANCE_SENT_REFUND',
  'MANUAL_REFUND_MARK',
  'MANUAL_MARK_VOIDED',
  'PROOF_ADDED',
  'NOTIFIED',
];

describe('rentalEventKey', () => {
  it.each(TIMELINE)('labels the %s step with its own key', (type) => {
    expect(rentalEventKey(type)).toBe(`venueRentals.event.${type}`);
  });

  it('falls back to the booking label for a step it does not know', () => {
    expect(rentalEventKey('SOMETHING_NEW')).toBe('venueRentals.event.BOOKED');
    expect(rentalEventKey(undefined)).toBe('venueRentals.event.BOOKED');
  });
});

describe('rentalActorKey', () => {
  it.each(['SYSTEM', 'FINANCE', 'VENUE', 'GUEST', 'RAZORPAY'])('labels %s', (role) => {
    expect(rentalActorKey(role)).toBe(`venueRentals.actor.${role}`);
  });

  it('reads an unknown actor as Duncit itself', () => {
    expect(rentalActorKey('ROBOT')).toBe('venueRentals.actor.SYSTEM');
    expect(rentalActorKey(null)).toBe('venueRentals.actor.SYSTEM');
  });
});

describe('rentalGatewayStatusKey', () => {
  it.each(['QUEUED', 'SENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'RECONCILIATION_REQUIRED', 'NOT_APPLICABLE'])(
    'labels the Razorpay record status %s',
    (status) => {
      expect(rentalGatewayStatusKey(status)).toBe(`venueRentals.gatewayStatus.${status}`);
    }
  );

  it('never reads an unknown status as processed', () => {
    expect(rentalGatewayStatusKey('settled')).toBe('venueRentals.gatewayStatus.QUEUED');
  });
});

describe('rentalRefundSourceKey', () => {
  it('tells a rental’s own refund from the pod cancellation’s', () => {
    expect(rentalRefundSourceKey('RENTAL')).toBe('venueRentals.detail.sourceRENTAL');
    expect(rentalRefundSourceKey('POD_CANCELLATION')).toBe('venueRentals.detail.sourcePOD_CANCELLATION');
    expect(rentalRefundSourceKey('BACKOUT')).toBe('venueRentals.detail.sourceRENTAL');
  });
});

describe('rentalPodPath', () => {
  it('builds the mWeb pod page from the public ids', () => {
    expect(rentalPodPath({ public_id: 'sunday-chess', club_public_id: 'chai-club' })).toBe('/club/chai-club/pod/sunday-chess');
  });

  it('gives no link for a pod that is gone or missing either id', () => {
    expect(rentalPodPath(null)).toBeNull();
    expect(rentalPodPath({ public_id: '', club_public_id: 'chai-club' })).toBeNull();
    expect(rentalPodPath({ public_id: 'sunday-chess', club_public_id: '' })).toBeNull();
  });
});
