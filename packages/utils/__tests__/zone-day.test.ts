import { describe, expect, it } from 'vitest';
import { startOfDayInZone } from '../src/zone-day';

describe('startOfDayInZone', () => {
  it('is local midnight of the day on the zone’s own clock, as epoch ms', () => {
    // 00:00 in Kolkata (UTC+5:30) is 18:30 UTC the day before.
    expect(startOfDayInZone('2026-11-05', 'Asia/Kolkata')).toBe(Date.parse('2026-11-04T18:30:00.000Z'));
    // A zone behind UTC (EDT, UTC-4) starts its day later on the UTC clock.
    expect(startOfDayInZone('2026-07-01', 'America/New_York')).toBe(Date.parse('2026-07-01T04:00:00.000Z'));
    expect(startOfDayInZone(' 2026-11-05 ', 'UTC')).toBe(Date.parse('2026-11-05T00:00:00.000Z'));
  });

  it('reads an unknown zone as UTC instead of throwing', () => {
    expect(startOfDayInZone('2026-12-31', 'Not/AZone')).toBe(Date.parse('2026-12-31T00:00:00.000Z'));
  });

  it('is NaN for anything that is not a calendar day', () => {
    expect(startOfDayInZone('05/11/2026', 'Asia/Kolkata')).toBeNaN();
    expect(startOfDayInZone('', 'Asia/Kolkata')).toBeNaN();
  });
});
