import {
  isVenueRejected,
  VENUE_REJECTED_NOTE,
  venueApprovalChip,
  venueOfferChip,
} from '@/utils/venue-approval';

describe('venueOfferChip', () => {
  it("names a pending pod the venue countered, so the host knows it is their move", () => {
    expect(venueOfferChip('PENDING', 'COUNTERED', 'Venue countered')).toEqual({
      label: 'Venue countered',
      tone: 'warning',
    });
  });

  it('falls back to the approval chip for every other state', () => {
    expect(venueOfferChip('PENDING', 'SENT', 'Venue countered')).toEqual(venueApprovalChip('PENDING'));
    expect(venueOfferChip('DECLINED', 'COUNTERED', 'Venue countered')).toEqual(
      venueApprovalChip('DECLINED'),
    );
    expect(venueOfferChip('APPROVED', null, 'Venue countered')).toBeNull();
  });
});

describe('venueApprovalChip', () => {
  it('maps DECLINED to the Venue Rejected chip', () => {
    expect(venueApprovalChip('DECLINED')).toEqual({ label: 'Venue Rejected', tone: 'error' });
  });

  it('maps PENDING to the approval-pending chip', () => {
    expect(venueApprovalChip('PENDING')).toEqual({
      label: 'Venue Approval Pending',
      tone: 'warning',
    });
  });

  it('hides the chip for every other state', () => {
    expect(venueApprovalChip('APPROVED')).toBeNull();
    expect(venueApprovalChip('NONE')).toBeNull();
    expect(venueApprovalChip(null)).toBeNull();
    expect(venueApprovalChip(undefined)).toBeNull();
  });
});

describe('isVenueRejected', () => {
  it('flags only DECLINED pods', () => {
    expect(isVenueRejected('DECLINED')).toBe(true);
    expect(isVenueRejected('PENDING')).toBe(false);
    expect(isVenueRejected(null)).toBe(false);
  });

  it('carries the spec resubmission note', () => {
    expect(VENUE_REJECTED_NOTE).toContain('Venue rejected your slot request');
    expect(VENUE_REJECTED_NOTE).toContain('submit your request again');
  });
});
