import {
  reopenDeadline,
  reopenExpired,
  setReopenWindowZone,
  getReopenWindowZone,
  DEFAULT_REOPEN_ZONE,
} from '../../reopenWindow';

describe('support reopen window (3 calendar days, IST default)', () => {
  afterEach(() => setReopenWindowZone(DEFAULT_REOPEN_ZONE));

  // 2026-06-10T12:00:00Z = 17:30 IST on 10 Jun → reopenable through end of 12 Jun
  // → cutoff at start of 13 Jun IST = 2026-06-12T18:30:00.000Z.
  const resolved = new Date('2026-06-10T12:00:00.000Z');

  it('defaults to Asia/Kolkata', () => {
    expect(getReopenWindowZone()).toBe('Asia/Kolkata');
  });

  it('returns null when never resolved', () => {
    expect(reopenDeadline(null)).toBeNull();
    expect(reopenExpired(null)).toBe(false);
  });

  it('computes the calendar-day cutoff independent of resolution time', () => {
    expect(reopenDeadline(resolved)!.toISOString()).toBe('2026-06-12T18:30:00.000Z');
    // A late-night resolution on the same IST day yields the same cutoff.
    const lateSameDay = new Date('2026-06-10T20:00:00.000Z'); // 01:30 IST on 11 Jun → different day
    expect(reopenDeadline(lateSameDay)!.toISOString()).toBe('2026-06-13T18:30:00.000Z');
  });

  it('is reopenable up to the cutoff and expired after it', () => {
    expect(reopenExpired(resolved, Date.parse('2026-06-12T18:00:00.000Z'))).toBe(false);
    expect(reopenExpired(resolved, Date.parse('2026-06-12T18:30:00.000Z'))).toBe(true);
    expect(reopenExpired(resolved, Date.parse('2026-06-15T00:00:00.000Z'))).toBe(true);
  });
});

describe('support reopen window (admin-configurable timezone)', () => {
  afterEach(() => setReopenWindowZone(DEFAULT_REOPEN_ZONE));

  const resolved = new Date('2026-06-10T12:00:00.000Z');

  it('honours an explicit tz override (UTC) for the day boundary', () => {
    // 12:00 UTC on 10 Jun → cutoff at start of 13 Jun 00:00 UTC.
    expect(reopenDeadline(resolved, 'UTC')!.toISOString()).toBe('2026-06-13T00:00:00.000Z');
    expect(reopenExpired(resolved, Date.parse('2026-06-12T23:59:00.000Z'), 'UTC')).toBe(false);
    expect(reopenExpired(resolved, Date.parse('2026-06-13T00:00:00.000Z'), 'UTC')).toBe(true);
  });

  it('reads the cached zone set from settings on boot', () => {
    setReopenWindowZone('America/New_York');
    expect(getReopenWindowZone()).toBe('America/New_York');
    // 12:00 UTC on 10 Jun = 08:00 EDT on 10 Jun → cutoff start of 13 Jun EDT = 04:00 UTC.
    expect(reopenDeadline(resolved)!.toISOString()).toBe('2026-06-13T04:00:00.000Z');
  });

  it('falls back to the default zone for empty/blank input', () => {
    setReopenWindowZone('   ');
    expect(getReopenWindowZone()).toBe('Asia/Kolkata');
    setReopenWindowZone(null);
    expect(getReopenWindowZone()).toBe('Asia/Kolkata');
  });
});
