import { describe, expect, it } from 'vitest';
import {
  CANCEL_SPOT_GENERIC_ERROR_KEY,
  cancelSpotErrorKey,
  freePodVenueNotice,
  isFreePod,
} from '../src/pod-free';

describe('isFreePod', () => {
  it('is true only for the FREE pod type', () => {
    expect(isFreePod('FREE')).toBe(true);
    expect(isFreePod('PAID')).toBe(false);
    expect(isFreePod('free')).toBe(false);
    expect(isFreePod('')).toBe(false);
    expect(isFreePod(null)).toBe(false);
    expect(isFreePod(undefined)).toBe(false);
  });
});

describe('freePodVenueNotice', () => {
  const owed = { podType: 'FREE', slotPrice: 1500, ownVenue: false, slotConfirmed: false };

  it('asks the host to settle before the venue approves a priced slot', () => {
    expect(freePodVenueNotice(owed)).toBe('SETTLE_BEFORE_APPROVAL');
    // The two flags are optional — a caller that knows neither still gets the note.
    expect(freePodVenueNotice({ podType: 'FREE', slotPrice: 1 })).toBe('SETTLE_BEFORE_APPROVAL');
  });

  it('drops the approval half when a Pod Request already confirmed the slot', () => {
    expect(freePodVenueNotice({ ...owed, slotConfirmed: true })).toBe('SETTLE');
  });

  it('says nothing for a paid pod, whatever the slot costs', () => {
    expect(freePodVenueNotice({ ...owed, podType: 'PAID' })).toBe('NONE');
    expect(freePodVenueNotice({ ...owed, podType: null })).toBe('NONE');
    expect(freePodVenueNotice({ slotPrice: 1500 })).toBe('NONE');
  });

  it('says nothing for the host own venue, which books instantly', () => {
    expect(freePodVenueNotice({ ...owed, ownVenue: true })).toBe('NONE');
    expect(freePodVenueNotice({ ...owed, ownVenue: true, slotConfirmed: true })).toBe('NONE');
  });

  it('says nothing when the slot is unpriced or not picked yet', () => {
    expect(freePodVenueNotice({ ...owed, slotPrice: 0 })).toBe('NONE');
    expect(freePodVenueNotice({ ...owed, slotPrice: null })).toBe('NONE');
    expect(freePodVenueNotice({ ...owed, slotPrice: undefined })).toBe('NONE');
    expect(freePodVenueNotice({ ...owed, slotPrice: -200 })).toBe('NONE');
    expect(freePodVenueNotice({ ...owed, slotPrice: Number.NaN })).toBe('NONE');
  });
});

describe('cancelSpotErrorKey', () => {
  it('names each refusal cancelFreeSpot can answer with', () => {
    expect(cancelSpotErrorKey('ALREADY_CHECKED_IN')).toBe('mweb.podDetails.cancelSpotCheckedIn');
    expect(cancelSpotErrorKey('BAD_REQUEST')).toBe('mweb.podDetails.cancelSpotStarted');
    expect(cancelSpotErrorKey('NOT_FOUND')).toBe('mweb.podDetails.cancelSpotNotMember');
  });

  it('falls back to the generic sentence for a network failure or an unknown code', () => {
    expect(cancelSpotErrorKey(null)).toBe(CANCEL_SPOT_GENERIC_ERROR_KEY);
    expect(cancelSpotErrorKey(undefined)).toBe(CANCEL_SPOT_GENERIC_ERROR_KEY);
    expect(cancelSpotErrorKey('NOT_FREE_POD')).toBe(CANCEL_SPOT_GENERIC_ERROR_KEY);
    expect(CANCEL_SPOT_GENERIC_ERROR_KEY).toBe('mweb.podDetails.cancelSpotFailed');
  });
});
