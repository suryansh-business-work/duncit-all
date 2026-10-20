import { describe, expect, it } from 'vitest';
import {
  CANCEL_SPOT_GENERIC_ERROR_KEY,
  cancelSpotErrorKey,
  freePodVenueNotice,
  freeSpotCancelHint,
  freeSpotCancelsLeft,
  isFreePod,
  isFreeSpotCancelMaxed,
  memberBookedCopy,
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
  const owed = { podType: 'FREE', slotPrice: 1500, ownVenue: false };

  it('asks the host to settle a priced partner booking with the venue directly', () => {
    expect(freePodVenueNotice(owed)).toBe('SETTLE');
    // ownVenue is optional — a caller that does not know it still gets the note.
    expect(freePodVenueNotice({ podType: 'FREE', slotPrice: 1 })).toBe('SETTLE');
  });

  it('says nothing for a paid pod, whatever the slot costs', () => {
    expect(freePodVenueNotice({ ...owed, podType: 'PAID' })).toBe('NONE');
    expect(freePodVenueNotice({ ...owed, podType: null })).toBe('NONE');
    expect(freePodVenueNotice({ slotPrice: 1500 })).toBe('NONE');
  });

  it('says nothing for the host own venue, which books instantly', () => {
    expect(freePodVenueNotice({ ...owed, ownVenue: true })).toBe('NONE');
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
    expect(cancelSpotErrorKey('CANCEL_LIMIT_REACHED')).toBe('mweb.podDetails.cancelSpotLimitReached');
  });

  it('falls back to the generic sentence for a network failure or an unknown code', () => {
    expect(cancelSpotErrorKey(null)).toBe(CANCEL_SPOT_GENERIC_ERROR_KEY);
    expect(cancelSpotErrorKey(undefined)).toBe(CANCEL_SPOT_GENERIC_ERROR_KEY);
    expect(cancelSpotErrorKey('NOT_FREE_POD')).toBe(CANCEL_SPOT_GENERIC_ERROR_KEY);
    expect(CANCEL_SPOT_GENERIC_ERROR_KEY).toBe('mweb.podDetails.cancelSpotFailed');
  });
});

describe('freeSpotCancelsLeft', () => {
  it('subtracts the used cancellations from the pod cap', () => {
    expect(freeSpotCancelsLeft({ spot_cancels_used: 0, spot_cancels_max: 3 })).toBe(3);
    expect(freeSpotCancelsLeft({ spot_cancels_used: 2, spot_cancels_max: 3 })).toBe(1);
    expect(freeSpotCancelsLeft({ spot_cancels_used: 3, spot_cancels_max: 3 })).toBe(0);
  });

  it('reads a missing used count as none used', () => {
    expect(freeSpotCancelsLeft({ spot_cancels_max: 2 })).toBe(2);
    expect(freeSpotCancelsLeft({ spot_cancels_used: null, spot_cancels_max: 2 })).toBe(2);
  });

  it('never goes below zero when the server counted past the cap', () => {
    expect(freeSpotCancelsLeft({ spot_cancels_used: 5, spot_cancels_max: 3 })).toBe(0);
  });

  it('answers null before the state arrives and on a paid pod (cap 0 or absent)', () => {
    expect(freeSpotCancelsLeft(null)).toBeNull();
    expect(freeSpotCancelsLeft(undefined)).toBeNull();
    expect(freeSpotCancelsLeft()).toBeNull();
    expect(freeSpotCancelsLeft({ spot_cancels_used: 0, spot_cancels_max: 0 })).toBeNull();
    expect(freeSpotCancelsLeft({ spot_cancels_used: 1, spot_cancels_max: null })).toBeNull();
    expect(freeSpotCancelsLeft({ spot_cancels_max: -1 })).toBeNull();
  });
});

describe('isFreeSpotCancelMaxed', () => {
  it('is true only once every cancellation is used', () => {
    expect(isFreeSpotCancelMaxed({ spot_cancels_used: 3, spot_cancels_max: 3 })).toBe(true);
    expect(isFreeSpotCancelMaxed({ spot_cancels_used: 4, spot_cancels_max: 3 })).toBe(true);
    expect(isFreeSpotCancelMaxed({ spot_cancels_used: 2, spot_cancels_max: 3 })).toBe(false);
  });

  it('is false while the state is unknown and on a paid pod', () => {
    expect(isFreeSpotCancelMaxed(null)).toBe(false);
    expect(isFreeSpotCancelMaxed()).toBe(false);
    expect(isFreeSpotCancelMaxed({ spot_cancels_used: 0, spot_cancels_max: 0 })).toBe(false);
  });
});

describe('freeSpotCancelHint', () => {
  it('counts the cancellations left while there are two or more', () => {
    expect(freeSpotCancelHint({ spot_cancels_used: 0, spot_cancels_max: 3 })).toEqual({
      key: 'mweb.podDetails.cancelSpotRemaining',
      vars: { left: 3 },
    });
    expect(freeSpotCancelHint({ spot_cancels_used: 1, spot_cancels_max: 3 })).toEqual({
      key: 'mweb.podDetails.cancelSpotRemaining',
      vars: { left: 2 },
    });
  });

  it('warns on the last one, without a count', () => {
    expect(freeSpotCancelHint({ spot_cancels_used: 2, spot_cancels_max: 3 })).toEqual({
      key: 'mweb.podDetails.cancelSpotLastOne',
    });
  });

  it('says the limit is reached once none are left — the same key the server refusal maps to', () => {
    const hint = freeSpotCancelHint({ spot_cancels_used: 3, spot_cancels_max: 3 });
    expect(hint).toEqual({ key: 'mweb.podDetails.cancelSpotLimitReached' });
    expect(hint?.key).toBe(cancelSpotErrorKey('CANCEL_LIMIT_REACHED'));
  });

  it('says nothing before the state arrives or on a paid pod', () => {
    expect(freeSpotCancelHint(null)).toBeNull();
    expect(freeSpotCancelHint()).toBeNull();
    expect(freeSpotCancelHint({ spot_cancels_used: 0, spot_cancels_max: 0 })).toBeNull();
  });
});

describe('memberBookedCopy', () => {
  const base = { isFree: false, isExpired: false, canBackout: true, canCancelSpot: false, spotCancels: null };

  it('says nothing extra on a paid pod that can still be backed out of', () => {
    expect(memberBookedCopy(base)).toEqual({
      note: null,
      overlineKey: 'mweb.podDetails.youreGoing',
      badgeKey: 'mweb.podDetails.podBooked',
    });
  });

  it('names the backout cap when a paid pod can no longer be left', () => {
    expect(memberBookedCopy({ ...base, canBackout: false }).note).toEqual({ key: 'mweb.podDetails.backoutMaxed' });
  });

  it('switches to the past-tense copy once the pod has happened', () => {
    const copy = memberBookedCopy({ ...base, canBackout: false, isExpired: true });
    expect(copy).toEqual({
      note: { key: 'mweb.podDetails.alreadyTakenPlace' },
      overlineKey: 'mweb.podDetails.youWent',
      badgeKey: 'mweb.podDetails.podVisited',
    });
  });

  it('counts the free cancellations left while the spot can still be cancelled', () => {
    const copy = memberBookedCopy({ ...base, isFree: true, canCancelSpot: true, spotCancels: { spot_cancels_used: 2, spot_cancels_max: 5 } });
    expect(copy.note).toEqual({ key: 'mweb.podDetails.cancelSpotRemaining', vars: { left: 3 } });
  });

  it('blames the used-up cap, not a check-in, when every free cancellation is gone', () => {
    const copy = memberBookedCopy({ ...base, isFree: true, canCancelSpot: false, spotCancels: { spot_cancels_used: 5, spot_cancels_max: 5 } });
    expect(copy.note).toEqual({ key: 'mweb.podDetails.cancelSpotLimitReached' });
  });

  it('blames the check-in when a free spot is locked with cancellations still left', () => {
    const copy = memberBookedCopy({ ...base, isFree: true, canCancelSpot: false, spotCancels: { spot_cancels_used: 1, spot_cancels_max: 5 } });
    expect(copy.note).toEqual({ key: 'mweb.podDetails.cancelSpotCheckedIn' });
  });
});
