import { describe, expect, it } from 'vitest';
import { podBucket } from './podBucket';

const NOW = new Date('2026-07-06T12:00:00Z').getTime();
const iso = (offsetMs: number) => new Date(NOW + offsetMs).toISOString();
const HOUR = 3_600_000;

describe('podBucket', () => {
  it('classifies a future pod as upcoming', () => {
    expect(podBucket({ pod_date_time: iso(HOUR) }, NOW)).toBe('upcoming');
  });

  it('classifies a started, not-yet-ended pod as ongoing', () => {
    expect(podBucket({ pod_date_time: iso(-HOUR), pod_end_date_time: iso(HOUR) }, NOW)).toBe('ongoing');
  });

  it('classifies a finished pod as hosted', () => {
    expect(podBucket({ pod_date_time: iso(-2 * HOUR), pod_end_date_time: iso(-HOUR) }, NOW)).toBe('hosted');
  });

  it('classifies a past pod with no end as hosted', () => {
    expect(podBucket({ pod_date_time: iso(-HOUR), pod_end_date_time: null }, NOW)).toBe('hosted');
  });

  it('defaults now to the current time', () => {
    // Far-future start is always upcoming regardless of the real clock.
    expect(podBucket({ pod_date_time: '2999-01-01T00:00:00Z' })).toBe('upcoming');
  });
});
