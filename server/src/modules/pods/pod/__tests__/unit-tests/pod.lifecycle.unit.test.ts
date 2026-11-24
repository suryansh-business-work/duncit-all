import { POD_COMPLETE_LEAD_MINUTES, POD_LIVE_TAIL_MS, podBookingClosed, podCompletionOpen } from '../../pod.lifecycle';

const HOUR = 3_600_000;
const NOW = Date.parse('2026-11-22T12:00:00.000Z');
const at = (offsetMs: number) => new Date(NOW + offsetMs);

describe('podBookingClosed', () => {
  it('stays open before the pod starts', () => {
    expect(podBookingClosed({ pod_date_time: at(HOUR), pod_end_date_time: at(3 * HOUR) }, NOW)).toBe(false);
  });

  it('stays open while the pod is ongoing, up to and including its end', () => {
    expect(podBookingClosed({ pod_date_time: at(-HOUR), pod_end_date_time: at(HOUR) }, NOW)).toBe(false);
    expect(podBookingClosed({ pod_date_time: at(-HOUR), pod_end_date_time: at(0) }, NOW)).toBe(false);
  });

  it('closes once the end time has passed', () => {
    expect(podBookingClosed({ pod_date_time: at(-3 * HOUR), pod_end_date_time: at(-1) }, NOW)).toBe(true);
  });

  it('reads an end-less pod as over POD_LIVE_TAIL_MS after its start', () => {
    expect(podBookingClosed({ pod_date_time: at(-POD_LIVE_TAIL_MS) }, NOW)).toBe(false);
    expect(podBookingClosed({ pod_date_time: at(-POD_LIVE_TAIL_MS - 1) }, NOW)).toBe(true);
    // An unparseable end falls back to the tail too.
    expect(podBookingClosed({ pod_date_time: at(-HOUR), pod_end_date_time: 'not-a-date' }, NOW)).toBe(false);
  });

  it('closes a pod Finance already completed, even mid-run', () => {
    expect(
      podBookingClosed({ pod_date_time: at(-HOUR), pod_end_date_time: at(HOUR), completed_at: at(-1) }, NOW),
    ).toBe(true);
  });

  it('never closes a pod with no usable start', () => {
    expect(podBookingClosed({ pod_date_time: null }, NOW)).toBe(false);
    expect(podBookingClosed({ pod_date_time: 'nonsense' }, NOW)).toBe(false);
  });
});

describe('podCompletionOpen', () => {
  const LEAD = POD_COMPLETE_LEAD_MINUTES * 60_000;

  it('opens fifteen minutes before the end', () => {
    expect(POD_COMPLETE_LEAD_MINUTES).toBe(15);
  });

  it('stays shut before the pod starts', () => {
    expect(podCompletionOpen({ pod_date_time: at(HOUR), pod_end_date_time: at(3 * HOUR) }, NOW)).toBe(false);
  });

  it('stays shut while the pod runs and its end is more than the lead away', () => {
    expect(podCompletionOpen({ pod_date_time: at(-HOUR), pod_end_date_time: at(HOUR) }, NOW)).toBe(false);
    expect(podCompletionOpen({ pod_date_time: at(-HOUR), pod_end_date_time: at(LEAD + 1) }, NOW)).toBe(false);
  });

  it('opens from exactly the lead before the end, and stays open after it', () => {
    expect(podCompletionOpen({ pod_date_time: at(-HOUR), pod_end_date_time: at(LEAD) }, NOW)).toBe(true);
    expect(podCompletionOpen({ pod_date_time: at(-3 * HOUR), pod_end_date_time: at(-HOUR) }, NOW)).toBe(true);
  });

  it('never opens before the start, even on a pod shorter than the lead', () => {
    expect(podCompletionOpen({ pod_date_time: at(5 * 60_000), pod_end_date_time: at(10 * 60_000) }, NOW)).toBe(false);
  });

  it('measures an end-less pod from the POD_LIVE_TAIL_MS tail', () => {
    expect(podCompletionOpen({ pod_date_time: at(-(POD_LIVE_TAIL_MS - LEAD)) }, NOW)).toBe(true);
    expect(podCompletionOpen({ pod_date_time: at(-HOUR) }, NOW)).toBe(false);
  });

  it('leaves a pod with no usable start settleable rather than stuck', () => {
    expect(podCompletionOpen({ pod_date_time: null }, NOW)).toBe(true);
    expect(podCompletionOpen({ pod_date_time: 'nonsense' }, NOW)).toBe(true);
  });

  it('reads the clock when no `now` is passed', () => {
    expect(podCompletionOpen({ pod_date_time: new Date(Date.now() + HOUR) })).toBe(false);
  });
});
