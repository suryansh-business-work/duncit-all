import { auditPodTimings, type PodTimingRow, type TimingAuditOptions } from '../../tools/pods/pod-timing.audit';

const T0 = Date.parse('2026-10-20T10:00:00.000Z');
const MIN = 60_000;
const at = (minutes: number) => new Date(T0 + minutes * MIN).toISOString();

/** A pod starting `start` minutes after T0 and ending at `end` (null: no end). */
function pod(id: string, start: number, end: number | null, over: Partial<PodTimingRow> = {}): PodTimingRow {
  return {
    id,
    pod_title: `Pod ${id}`,
    pod_date_time: at(start),
    pod_end_date_time: end === null ? null : at(end),
    venue_id: null,
    pod_hosts_id: [],
    is_deleted: false,
    completed_at: null,
    created_at: at(start - 24 * 60),
    ...over,
  };
}

/** Long after every pod in these tests, unless a test says otherwise. */
const options = (over: Partial<TimingAuditOptions> = {}): TimingAuditOptions => ({ now: T0 + 30 * 24 * 60 * MIN, ...over });
const checksOf = (rows: PodTimingRow[], over: Partial<TimingAuditOptions> = {}) => auditPodTimings(rows, options(over)).issues.map((issue) => issue.check);

describe('auditPodTimings — always-on checks', () => {
  it('finds nothing wrong with a sane pod', () => {
    expect(auditPodTimings([pod('a', 0, 120)], options()).issues).toEqual([]);
  });

  it('reports a start that is not a date as INVALID_DATE and checks nothing else about it', () => {
    const { issues } = auditPodTimings([pod('a', 0, 120, { pod_date_time: 'next sunday', venue_id: 'v1' }), pod('b', 0, 120, { venue_id: 'v1' })], options());
    expect(issues).toEqual([
      {
        check: 'INVALID_DATE',
        severity: 'error',
        pod_id: 'a',
        pod_title: 'Pod a',
        start: 'next sunday',
        end: at(120),
        detail: 'The start or end time is not a valid date.',
      },
    ]);
  });

  it('reports an end that is set but not a date as INVALID_DATE', () => {
    expect(checksOf([pod('a', 0, null, { pod_end_date_time: '25:99' })])).toEqual(['INVALID_DATE']);
  });

  it('treats an empty end as missing rather than invalid', () => {
    expect(checksOf([pod('a', 0, null, { pod_end_date_time: '' })])).toEqual(['MISSING_END']);
  });

  it('warns when a pod has no end time', () => {
    const [issue] = auditPodTimings([pod('a', 0, null)], options()).issues;
    expect(issue).toMatchObject({ check: 'MISSING_END', severity: 'warning', end: null, detail: 'The pod has no end time.' });
  });

  it('errors when a pod ends exactly as it starts', () => {
    const [issue] = auditPodTimings([pod('a', 0, 0)], options()).issues;
    expect(issue).toMatchObject({ check: 'END_NOT_AFTER_START', severity: 'error', detail: 'It ends 0 min before (or as) it starts.' });
  });

  it('errors when a pod ends before it starts, saying by how much', () => {
    expect(auditPodTimings([pod('a', 0, -30)], options()).issues[0].detail).toBe('It ends 30 min before (or as) it starts.');
  });

  it('errors when a pod was completed before it began, but not when completed as it began', () => {
    const [issue] = auditPodTimings([pod('a', 0, 120, { completed_at: at(-15) })], options()).issues;
    expect(issue).toMatchObject({ check: 'COMPLETED_BEFORE_START', severity: 'error', detail: 'Marked complete 15 min before it started.' });
    expect(checksOf([pod('a', 0, 120, { completed_at: at(0) })])).toEqual([]);
  });

  it('warns when a pod was created after its own start, but not when created exactly at it', () => {
    const [issue] = auditPodTimings([pod('a', 0, 120, { created_at: at(90) })], options()).issues;
    expect(issue).toMatchObject({ check: 'CREATED_AFTER_START', severity: 'warning', detail: 'Created 90 min after its own start time.' });
    expect(checksOf([pod('a', 0, 120, { created_at: at(0) })])).toEqual([]);
  });

  it('ignores completion and creation stamps that are missing or unreadable', () => {
    expect(checksOf([pod('a', 0, 120, { completed_at: 'soon', created_at: null })])).toEqual([]);
  });
});

describe('auditPodTimings — overlaps', () => {
  it('reports two live pods overlapping at one venue once, on the later pod', () => {
    const { issues } = auditPodTimings([pod('b', 60, 180, { venue_id: 'v1' }), pod('a', 0, 120, { venue_id: 'v1' })], options());
    expect(issues).toEqual([
      {
        check: 'VENUE_OVERLAP',
        severity: 'warning',
        pod_id: 'b',
        pod_title: 'Pod b',
        start: at(60),
        end: at(180),
        detail: 'Overlaps "Pod a" at the same venue (v1).',
        related_pod_id: 'a',
      },
    ]);
  });

  it('does not treat back-to-back pods as overlapping', () => {
    expect(checksOf([pod('a', 0, 60, { venue_id: 'v1' }), pod('b', 60, 120, { venue_id: 'v1' })])).toEqual([]);
  });

  it('does not compare pods at different venues', () => {
    expect(checksOf([pod('a', 0, 120, { venue_id: 'v1' }), pod('b', 60, 180, { venue_id: 'v2' })])).toEqual([]);
  });

  it('ignores cancelled pods and pods without a real window', () => {
    const rows = [
      pod('a', 0, 120, { venue_id: 'v1' }),
      pod('cancelled', 30, 90, { venue_id: 'v1', is_deleted: true }),
      pod('open', 40, null, { venue_id: 'v1' }),
      pod('backwards', 50, 20, { venue_id: 'v1' }),
    ];
    expect(checksOf(rows)).toEqual(['MISSING_END', 'END_NOT_AFTER_START']);
  });

  it('reports every overlapping pair when three pods collide', () => {
    const { issues } = auditPodTimings(
      [pod('a', 0, 300, { venue_id: 'v1' }), pod('b', 60, 120, { venue_id: 'v1' }), pod('c', 90, 200, { venue_id: 'v1' })],
      options()
    );
    expect(issues.map((issue) => [issue.pod_id, issue.related_pod_id])).toEqual([
      ['b', 'a'],
      ['c', 'a'],
      ['c', 'b'],
    ]);
  });

  it('reports a host double-booked across two pods', () => {
    const { issues } = auditPodTimings([pod('a', 0, 120, { pod_hosts_id: ['h1'] }), pod('b', 60, 180, { pod_hosts_id: ['h1', 'h2'] })], options());
    expect(issues).toEqual([expect.objectContaining({ check: 'HOST_OVERLAP', pod_id: 'b', related_pod_id: 'a', detail: 'Overlaps "Pod a" at the same host (h1).' })]);
  });

  it('never reports a pod overlapping itself when a host is listed twice', () => {
    expect(checksOf([pod('a', 0, 120, { pod_hosts_id: ['h1', 'h1'] })])).toEqual([]);
  });

  it('reports one overlap per shared host', () => {
    expect(checksOf([pod('a', 0, 120, { pod_hosts_id: ['h1', 'h2'] }), pod('b', 60, 180, { pod_hosts_id: ['h2', 'h1'] })])).toEqual([
      'HOST_OVERLAP',
      'HOST_OVERLAP',
    ]);
  });

  it('copes with pods that have no host list at all', () => {
    expect(checksOf([pod('a', 0, 120, { pod_hosts_id: null }), pod('b', 60, 180, { pod_hosts_id: undefined })])).toEqual([]);
  });
});

describe('auditPodTimings — threshold checks', () => {
  it('skips the duration and completion checks unless a threshold is given, and says how to run them', () => {
    const result = auditPodTimings([pod('a', 0, 5)], options());
    expect(result.issues).toEqual([]);
    expect(result.checked).toEqual(['INVALID_DATE', 'MISSING_END', 'END_NOT_AFTER_START', 'COMPLETED_BEFORE_START', 'CREATED_AFTER_START', 'VENUE_OVERLAP', 'HOST_OVERLAP']);
    expect(result.skipped).toEqual([
      'TOO_SHORT — pass min_duration_minutes to check it',
      'TOO_LONG — pass max_duration_minutes to check it',
      'NOT_COMPLETED_AFTER_END — pass completion_grace_minutes to check it',
    ]);
  });

  it('runs every check once all thresholds are given, zero included', () => {
    const result = auditPodTimings([], options({ minDurationMinutes: 0, maxDurationMinutes: 0, completionGraceMinutes: 0 }));
    expect(result.checked.slice(-3)).toEqual(['TOO_SHORT', 'TOO_LONG', 'NOT_COMPLETED_AFTER_END']);
    expect(result.skipped).toEqual([]);
  });

  it('flags a pod shorter than the minimum, not one exactly at it', () => {
    const [issue] = auditPodTimings([pod('a', 0, 45)], options({ minDurationMinutes: 60 })).issues;
    expect(issue).toMatchObject({ check: 'TOO_SHORT', severity: 'warning', detail: 'It lasts 45 min, under the 60 min minimum.' });
    expect(checksOf([pod('a', 0, 60)], { minDurationMinutes: 60 })).toEqual([]);
  });

  it('flags a pod longer than the maximum, not one exactly at it', () => {
    const [issue] = auditPodTimings([pod('a', 0, 240)], options({ maxDurationMinutes: 180 })).issues;
    expect(issue).toMatchObject({ check: 'TOO_LONG', detail: 'It lasts 240 min, over the 180 min maximum.' });
    expect(checksOf([pod('a', 0, 180)], { maxDurationMinutes: 180 })).toEqual([]);
  });

  it('judges duration in whole minutes', () => {
    // 59.6 minutes rounds to 60, which is not under a 60-minute minimum.
    const almost = pod('a', 0, 0, { pod_end_date_time: new Date(T0 + 59.6 * MIN).toISOString() });
    expect(checksOf([almost], { minDurationMinutes: 60 })).toEqual([]);
  });

  it('flags a pod still not completed after the grace period, not one exactly at it', () => {
    const now = T0 + 120 * MIN + 30 * MIN; // ends at 120, grace 30
    expect(checksOf([pod('a', 0, 120)], { now, completionGraceMinutes: 30 })).toEqual([]);
    const [issue] = auditPodTimings([pod('a', 0, 120)], options({ now: now + MIN, completionGraceMinutes: 30 })).issues;
    expect(issue).toMatchObject({ check: 'NOT_COMPLETED_AFTER_END', detail: 'It ended 31 min ago and is still not completed.' });
  });

  it('does not chase completion of a pod that was completed or cancelled', () => {
    expect(checksOf([pod('a', 0, 120, { completed_at: at(130) }), pod('b', 0, 120, { is_deleted: true })], { completionGraceMinutes: 30 })).toEqual([]);
  });
});
