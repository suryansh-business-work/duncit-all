import { describe, expect, it } from 'vitest';
import {
  HEALTH_APPEAL_REASONS,
  HEALTH_APPEAL_REASON_KEY,
  HEALTH_APPEAL_STATUSES,
  HEALTH_APPEAL_STATUS_COLOR,
  HEALTH_APPEAL_STATUS_KEY,
  healthAppealStateOf,
  isHealthAppealReason,
} from '../src/health-appeal';

describe('isHealthAppealReason', () => {
  it('accepts exactly the reasons the server stores', () => {
    expect(isHealthAppealReason('WONT_HAPPEN_AGAIN')).toBe(true);
    expect(isHealthAppealReason('INCORRECT')).toBe(true);
  });

  it('refuses a blank pick, a lower-cased value and anything unknown', () => {
    for (const value of ['', 'incorrect', 'OTHER']) expect(isHealthAppealReason(value)).toBe(false);
  });
});

describe('healthAppealStateOf', () => {
  it('offers an appeal on a deduction that still counts and has none yet', () => {
    expect(healthAppealStateOf({ delta: -10, waived: false })).toBe('APPEALABLE');
    expect(healthAppealStateOf({ delta: -1, waived: false, appeal_status: null })).toBe('APPEALABLE');
  });

  it('never offers one on a bonus', () => {
    expect(healthAppealStateOf({ delta: 5, waived: false })).toBeNull();
  });

  it('shows the filed appeal instead of the button, whatever its outcome', () => {
    expect(healthAppealStateOf({ delta: -10, waived: false, appeal_status: 'PENDING' })).toBe('PENDING');
    expect(healthAppealStateOf({ delta: -10, waived: false, appeal_status: 'DENIED' })).toBe('DENIED');
    expect(healthAppealStateOf({ delta: -10, waived: true, appeal_status: 'ACCEPTED' })).toBe('ACCEPTED');
  });

  it('offers nothing on a deduction that was already lifted', () => {
    expect(healthAppealStateOf({ delta: -10, waived: true })).toBeNull();
  });
});

describe('health appeal copy tables', () => {
  it('names every reason the server accepts, in the order the form offers them', () => {
    expect(HEALTH_APPEAL_REASONS).toEqual(['WONT_HAPPEN_AGAIN', 'INCORRECT']);
    expect(HEALTH_APPEAL_REASONS.map((reason) => HEALTH_APPEAL_REASON_KEY[reason])).toEqual([
      'healthAppeal.reason.wontHappenAgain',
      'healthAppeal.reason.incorrect',
    ]);
  });

  it('gives every status a key and a tone', () => {
    expect(HEALTH_APPEAL_STATUSES.map((status) => HEALTH_APPEAL_STATUS_KEY[status])).toEqual([
      'healthAppeal.status.pending',
      'healthAppeal.status.accepted',
      'healthAppeal.status.denied',
    ]);
    expect(HEALTH_APPEAL_STATUSES.map((status) => HEALTH_APPEAL_STATUS_COLOR[status])).toEqual([
      'warning',
      'success',
      'default',
    ]);
  });
});
