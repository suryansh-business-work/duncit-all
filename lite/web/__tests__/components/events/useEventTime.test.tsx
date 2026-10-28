import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEventTime } from '../../../components/events/useEventTime';
import { renderHookWithProviders } from '../../test-utils';

// The device is pinned to the events' own zone, so these hold whichever zone
// the console's formatter applies (dd MMM yyyy, hh:mm a — see APP_SETTINGS).
beforeEach(() => {
  vi.stubEnv('TZ', 'Asia/Kolkata');
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

const timeOf = (start: string, end: string) => renderHookWithProviders(() => useEventTime({ start_at: start, end_at: end, timezone: 'Asia/Kolkata' })).result.current;

describe('useEventTime', () => {
  it('formats the start in the console’s date and time patterns', () => {
    const when = timeOf('2026-11-21T13:30:00.000Z', '2026-11-21T16:00:00.000Z');
    expect(when.date).toBe('21 Nov 2026');
    expect(when.time).toBe('07:00 PM');
  });

  it('gives the range as start – end times when the event ends the same day', () => {
    const when = timeOf('2026-11-21T13:30:00.000Z', '2026-11-21T16:00:00.000Z');
    expect(when.sameDay).toBe(true);
    expect(when.range).toBe('07:00 PM – 09:30 PM');
  });

  it('adds the end date when the event runs past midnight', () => {
    const when = timeOf('2026-11-21T13:30:00.000Z', '2026-11-21T20:00:00.000Z');
    expect(when.sameDay).toBe(false);
    expect(when.range).toBe('07:00 PM – 22 Nov 2026 01:30 AM');
  });

  it('calls an event starting today Today', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-21T04:00:00.000Z'));
    expect(timeOf('2026-11-21T13:30:00.000Z', '2026-11-21T16:00:00.000Z').day).toBe('Today');
  });

  it('calls an event that started yesterday Yesterday', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-22T10:00:00.000Z'));
    expect(timeOf('2026-11-21T13:30:00.000Z', '2026-11-21T16:00:00.000Z').day).toBe('Yesterday');
  });

  it('reads the times on the event’s own clock, not the reader’s device', () => {
    // The device is in Delhi; the event is in New York, where 13:30 UTC is 08:30.
    const when = renderHookWithProviders(() => useEventTime({ start_at: '2026-11-21T13:30:00.000Z', end_at: '2026-11-21T16:00:00.000Z', timezone: 'America/New_York' })).result.current;
    expect(when.date).toBe('21 Nov 2026');
    expect(when.time).toBe('08:30 AM');
    expect(when.range).toBe('08:30 AM – 11:00 AM');
  });

  it('gives an empty text, not a crash, for an unreadable instant', () => {
    const when = timeOf('not a date', 'not a date');
    expect(when.date).toBe('');
    expect(when.time).toBe('');
  });
});
