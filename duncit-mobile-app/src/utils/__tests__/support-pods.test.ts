import { filterSupportPods } from '@/utils/support-pods';

const NOW = new Date('2026-06-06T12:00:00Z').getTime();
const iso = (ms: number) => new Date(NOW + ms).toISOString();
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const membership = (id: string, over: Record<string, unknown> = {}) =>
  ({
    id,
    pod: {
      id: `pod-${id}`,
      pod_id: `slug-${id}`,
      pod_title: `Pod ${id}`,
      pod_date_time: iso(2 * HOUR),
      pod_end_date_time: null,
      ...over,
    },
  }) as never;

describe('filterSupportPods', () => {
  it('keeps every joined pod and sorts upcoming pods soonest-first', () => {
    const items = [
      membership('a', { pod_date_time: iso(3 * DAY) }),
      membership('b', { pod_date_time: iso(1 * DAY) }),
    ];
    const result = filterSupportPods(items, NOW);
    expect(result.map((p) => p.membershipId)).toEqual(['b', 'a']);
    expect(result[0]?.podDocId).toBe('pod-b');
  });

  it('keeps far-future and long-past pods, ordering active/upcoming before ended', () => {
    const old = membership('old', {
      pod_date_time: iso(-2 * DAY),
      pod_end_date_time: iso(-2 * DAY + HOUR),
    });
    const far = membership('far', { pod_date_time: iso(10 * DAY) });
    // Both input orders so the active-before-ended comparison is exercised either
    // way the engine invokes the comparator.
    expect(filterSupportPods([old, far], NOW).map((p) => p.membershipId)).toEqual(['far', 'old']);
    expect(filterSupportPods([far, old], NOW).map((p) => p.membershipId)).toEqual(['far', 'old']);
  });

  it('orders ended pods most-recently-ended first', () => {
    const items = [
      membership('older', {
        pod_date_time: iso(-5 * DAY),
        pod_end_date_time: iso(-5 * DAY + HOUR),
      }),
      membership('recent', {
        pod_date_time: iso(-1 * DAY),
        pod_end_date_time: iso(-1 * DAY + HOUR),
      }),
    ];
    const result = filterSupportPods(items, NOW);
    expect(result.map((p) => p.membershipId)).toEqual(['recent', 'older']);
  });

  it('keeps a pod still inside its window and skips null pods', () => {
    const items = [
      membership('live', { pod_date_time: iso(-3 * HOUR), pod_end_date_time: iso(-1 * HOUR) }),
      { id: 'nopod', pod: null } as never,
    ];
    const result = filterSupportPods(items, NOW);
    expect(result.map((p) => p.membershipId)).toEqual(['live']);
    expect(result[0]?.endsAt).toBeTruthy();
  });

  it('uses a default 4h duration when no end time is set', () => {
    const items = [membership('def', { pod_date_time: iso(-3 * HOUR), pod_end_date_time: null })];
    const result = filterSupportPods(items, NOW);
    expect(result).toHaveLength(1);
    expect(result[0]?.endsAt).toBeNull();
  });
});
