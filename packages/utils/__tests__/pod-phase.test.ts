import { describe, expect, it } from 'vitest';

import {
  POD_LIVE_TAIL_MS,
  canCompletePod,
  podPhase,
  splitPodsByPhase,
  type PodPhaseFields,
} from '../src/pod-phase';

const NOW = new Date('2026-08-25T12:00:00.000Z').getTime();
const HOUR = 60 * 60 * 1000;
const at = (offsetMs: number) => new Date(NOW + offsetMs).toISOString();

describe('podPhase', () => {
  it('treats a pod with no usable start as upcoming', () => {
    expect(podPhase(null, null, NOW)).toBe('UPCOMING');
    expect(podPhase(undefined, undefined, NOW)).toBe('UPCOMING');
    expect(podPhase('not-a-date', null, NOW)).toBe('UPCOMING');
  });

  it('is upcoming before the start', () => {
    expect(podPhase(at(HOUR), at(2 * HOUR), NOW)).toBe('UPCOMING');
  });

  it('is ongoing from the start instant onward', () => {
    expect(podPhase(at(0), at(2 * HOUR), NOW)).toBe('ONGOING');
    expect(podPhase(at(-HOUR), at(HOUR), NOW)).toBe('ONGOING');
  });

  it('is still ongoing at the exact end instant', () => {
    expect(podPhase(at(-HOUR), at(0), NOW)).toBe('ONGOING');
  });

  it('is previous once the set end has passed', () => {
    expect(podPhase(at(-2 * HOUR), at(-HOUR), NOW)).toBe('PREVIOUS');
  });

  it('falls back to the live tail when no end is set', () => {
    expect(podPhase(at(-POD_LIVE_TAIL_MS + HOUR), null, NOW)).toBe('ONGOING');
    expect(podPhase(at(-POD_LIVE_TAIL_MS - HOUR), null, NOW)).toBe('PREVIOUS');
  });

  it('falls back to the live tail when the end is unparseable', () => {
    expect(podPhase(at(-HOUR), 'not-a-date', NOW)).toBe('ONGOING');
  });

  it('reads the clock when no `now` is passed', () => {
    const future = new Date(Date.now() + HOUR).toISOString();
    expect(podPhase(future)).toBe('UPCOMING');
  });
});

describe('splitPodsByPhase', () => {
  const pods: (PodPhaseFields & { id: string })[] = [
    { id: 'later', pod_date_time: at(3 * HOUR), pod_end_date_time: at(4 * HOUR) },
    { id: 'running', pod_date_time: at(-HOUR), pod_end_date_time: at(HOUR) },
    { id: 'over', pod_date_time: at(-5 * HOUR), pod_end_date_time: at(-4 * HOUR) },
    { id: 'tailing', pod_date_time: at(-HOUR), pod_end_date_time: null },
  ];

  it('buckets each pod once, keeping the given order', () => {
    const out = splitPodsByPhase(pods, NOW);
    expect(out.upcoming.map((p) => p.id)).toEqual(['later']);
    expect(out.ongoing.map((p) => p.id)).toEqual(['running', 'tailing']);
    expect(out.previous.map((p) => p.id)).toEqual(['over']);
  });

  it('returns three empty lists for an empty feed', () => {
    expect(splitPodsByPhase([], NOW)).toEqual({ upcoming: [], ongoing: [], previous: [] });
  });

  it('reads the clock when no `now` is passed', () => {
    const future = new Date(Date.now() + HOUR).toISOString();
    expect(splitPodsByPhase([{ pod_date_time: future }]).upcoming).toHaveLength(1);
  });
});

describe('canCompletePod', () => {
  // Completing settles the payout off the seats scanned in, so it is offered
  // only once the door is shut — a pod still running would freeze the answer
  // while guests are still arriving.
  it('offers Complete on a pod that is over', () => {
    expect(canCompletePod({ pod_date_time: at(-5 * HOUR), pod_end_date_time: at(-4 * HOUR) }, NOW)).toBe(
      true,
    );
  });

  it('offers nothing on a pod that has not started', () => {
    expect(canCompletePod({ pod_date_time: at(2 * HOUR) }, NOW)).toBe(false);
  });

  it('offers nothing while the pod is running', () => {
    expect(canCompletePod({ pod_date_time: at(-HOUR), pod_end_date_time: at(HOUR) }, NOW)).toBe(false);
  });

  it('reads the clock when no `now` is passed', () => {
    expect(canCompletePod({ pod_date_time: new Date(Date.now() + HOUR).toISOString() })).toBe(false);
  });
});
