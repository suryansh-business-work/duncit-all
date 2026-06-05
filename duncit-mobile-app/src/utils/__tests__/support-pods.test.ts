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
  it('keeps upcoming pods within 7 days and sorts by start', () => {
    const items = [
      membership('a', { pod_date_time: iso(3 * DAY) }),
      membership('b', { pod_date_time: iso(1 * DAY) }),
    ];
    const result = filterSupportPods(items, NOW);
    expect(result.map((p) => p.membershipId)).toEqual(['b', 'a']);
    expect(result[0]?.podDocId).toBe('pod-b');
  });

  it('drops pods more than 7 days out and pods past the 6h grace window', () => {
    const items = [
      membership('far', { pod_date_time: iso(10 * DAY) }),
      membership('old', { pod_date_time: iso(-2 * DAY), pod_end_date_time: iso(-2 * DAY + HOUR) }),
    ];
    expect(filterSupportPods(items, NOW)).toEqual([]);
  });

  it('keeps a pod still inside the grace window and skips null pods', () => {
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
