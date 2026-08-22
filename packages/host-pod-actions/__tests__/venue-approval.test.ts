import { describe, expect, it } from 'vitest';

import { VENUE_REJECTED_NOTE, isVenueRejected, venueApprovalChip } from '../src/venue-approval';

describe('venueApprovalChip', () => {
  it('shows a red chip once the venue has declined', () => {
    expect(venueApprovalChip('DECLINED')).toEqual({ label: 'Venue Rejected', color: 'error' });
  });

  it('shows a warning chip while the venue has not answered', () => {
    expect(venueApprovalChip('PENDING')).toEqual({ label: 'Venue Approval Pending', color: 'warning' });
  });

  it.each([['APPROVED'], ['ACCEPTED'], [''], [null], [undefined]])(
    'shows nothing for %j — only the in-flight states are surfaced',
    (status) => {
      expect(venueApprovalChip(status)).toBeNull();
    }
  );
});

describe('isVenueRejected', () => {
  it('is the gate on the host’s full edit-and-resubmit', () => {
    expect(isVenueRejected('DECLINED')).toBe(true);
    expect(isVenueRejected('PENDING')).toBe(false);
    expect(isVenueRejected(null)).toBe(false);
    expect(isVenueRejected(undefined)).toBe(false);
  });
});

describe('VENUE_REJECTED_NOTE', () => {
  it('tells the host both ways out — a different venue or a different slot', () => {
    expect(VENUE_REJECTED_NOTE).toContain('different venue');
    expect(VENUE_REJECTED_NOTE).toContain('different time slot');
  });
});
