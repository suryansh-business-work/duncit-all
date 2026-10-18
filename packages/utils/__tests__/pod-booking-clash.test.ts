import { describe, expect, it } from 'vitest';

import { MY_BOOKING_CLASHES_SDL, uniqueClashingPods } from '../src/pod-booking-clash';

const clash = (pod_id: string, target_pod_id: string, pod_date_time: string) => ({
  pod_id,
  target_pod_id,
  pod_date_time,
});

describe('uniqueClashingPods', () => {
  it('returns nothing when there is no clash', () => {
    expect(uniqueClashingPods([])).toEqual([]);
  });

  it('lists a booked pod once even when it clashes with several dates being booked', () => {
    const result = uniqueClashingPods([
      clash('a', 'date-1', '2026-11-01T10:00:00.000Z'),
      clash('a', 'date-2', '2026-11-01T10:00:00.000Z'),
    ]);
    expect(result).toEqual([clash('a', 'date-1', '2026-11-01T10:00:00.000Z')]);
  });

  it('orders the clashing pods by start time, earliest first', () => {
    const result = uniqueClashingPods([
      clash('late', 't', '2026-11-03T10:00:00.000Z'),
      clash('early', 't', '2026-11-01T10:00:00.000Z'),
      clash('middle', 't', '2026-11-02T10:00:00.000Z'),
    ]);
    expect(result.map((c) => c.pod_id)).toEqual(['early', 'middle', 'late']);
  });
});

describe('MY_BOOKING_CLASHES_SDL', () => {
  it('asks for every field the clash dialog renders and links with', () => {
    for (const field of ['target_pod_id', 'pod_id', 'pod_slug', 'club_slug', 'pod_title', 'pod_date_time', 'pod_end_date_time']) {
      expect(MY_BOOKING_CLASHES_SDL).toContain(field);
    }
    expect(MY_BOOKING_CLASHES_SDL).toContain('myBookingClashes(pod_doc_ids: $pod_doc_ids)');
  });
});
