import { describe, expect, it } from 'vitest';
import type { VenuePodRow } from '../src/venue-pods';
import {
  venueCancelDisabledText,
  venueCancelPenaltyHeadline,
  venueCancelSuccessMessage,
  type VenuePodsTranslate,
} from '../src/venue-pods-copy';

/**
 * A translator that answers with the key and whatever it was handed, so an
 * assertion sees both WHICH sentence was picked and the numbers it names.
 */
const t: VenuePodsTranslate = (key, options) => {
  const vars = Object.entries(options?.vars ?? {}).map(([name, value]) => `${name}=${value}`);
  return vars.length > 0 ? `${key}(${vars.join(',')})` : key;
};

describe('venueCancelPenaltyHeadline', () => {
  it('is written without a number until the admin-configured penalty has arrived', () => {
    expect(venueCancelPenaltyHeadline(null, t)).toBe('mweb.venuePods.penaltyUnknown');
    expect(venueCancelPenaltyHeadline(undefined, t)).toBe('mweb.venuePods.penaltyUnknown');
  });

  it('promises no Account Health hit when an admin has set the penalty to zero', () => {
    expect(venueCancelPenaltyHeadline(0, t)).toBe('mweb.venuePods.penaltyNone');
  });

  it('names the points, in the singular for exactly one', () => {
    expect(venueCancelPenaltyHeadline(1, t)).toBe(
      'mweb.venuePods.penaltyPoints(penalty=1,unit=mweb.venuePods.point)',
    );
    expect(venueCancelPenaltyHeadline(7, t)).toBe(
      'mweb.venuePods.penaltyPoints(penalty=7,unit=mweb.venuePods.points)',
    );
  });
});

describe('venueCancelSuccessMessage', () => {
  const result = {
    pod_id: 'DUN-POD-4821',
    health_penalty: 7,
    venue_health_score: 93,
    refunded_count: 3,
  };

  it('counts the refunds and names the Account Health the server answered with', () => {
    expect(venueCancelSuccessMessage(result, t)).toBe(
      'mweb.venuePods.cancelled(refunds=mweb.venuePods.refundedMany(count=3),score=93)',
    );
  });

  it('says a single refund in the singular', () => {
    expect(venueCancelSuccessMessage({ ...result, refunded_count: 1 }, t)).toBe(
      'mweb.venuePods.cancelled(refunds=mweb.venuePods.refundedOne,score=93)',
    );
  });
});

describe('venueCancelDisabledText', () => {
  it('stays silent while the action is live', () => {
    expect(venueCancelDisabledText({ bucket: 'UPCOMING', cancelled_at: null }, t)).toBeNull();
  });

  it('says why the action is off, one sentence per reason', () => {
    const rows: [VenuePodRow, string][] = [
      [
        { bucket: 'CANCELLED', cancelled_at: '2026-07-03T00:00:00.000Z' },
        'mweb.venuePods.alreadyCancelled',
      ],
      [{ bucket: 'ONGOING', cancelled_at: null }, 'mweb.venuePods.alreadyStarted'],
      [{ bucket: 'COMPLETED', cancelled_at: null }, 'mweb.venuePods.alreadyFinished'],
    ];
    for (const [row, key] of rows) {
      expect(venueCancelDisabledText(row, t)).toBe(key);
    }
  });
});
