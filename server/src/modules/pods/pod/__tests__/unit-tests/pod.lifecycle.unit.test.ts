import { POD_LIVE_TAIL_MS, podBookingClosed } from '../../pod.lifecycle';

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
