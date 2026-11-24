import { describe, expect, it } from 'vitest';

import {
  POD_COMPLETE_LEAD_MINUTES,
  POD_LIVE_TAIL_MS,
  POD_SCAN_LEAD_MINUTES,
  canAmendPod,
  canCompletePod,
  canScanPodTickets,
  nothingUpcoming,
  podPhase,
  podScanWindow,
  splitPodsByPhase,
  withinHappeningNearbyWindow,
  DEFAULT_HAPPENING_NEARBY_DAYS,
  type PodPhaseFields,
} from '../src/pod-phase';

const NOW = new Date('2026-08-25T12:00:00.000Z').getTime();
const HOUR = 60 * 60 * 1000;
const LEAD = POD_SCAN_LEAD_MINUTES * 60 * 1000;
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

describe('podScanWindow', () => {
  // The door opens a little before the start and shuts at the end — a ticket
  // scanned hours early would record someone present at an event not yet held.
  it('keeps the door shut until the lead before the start', () => {
    expect(podScanWindow({ pod_date_time: at(2 * HOUR) }, NOW)).toBe('NOT_OPEN');
    expect(podScanWindow({ pod_date_time: at(LEAD + 1) }, NOW)).toBe('NOT_OPEN');
  });

  it('opens the door exactly the lead before the start, and keeps it open while the pod runs', () => {
    expect(podScanWindow({ pod_date_time: at(LEAD) }, NOW)).toBe('OPEN');
    expect(podScanWindow({ pod_date_time: at(-HOUR), pod_end_date_time: at(HOUR) }, NOW)).toBe('OPEN');
  });

  it('shuts the door once the pod is over', () => {
    expect(podScanWindow({ pod_date_time: at(-5 * HOUR), pod_end_date_time: at(-4 * HOUR) }, NOW)).toBe(
      'CLOSED',
    );
  });

  it('never opens a pod that cannot be placed on a clock', () => {
    expect(podScanWindow({ pod_date_time: null }, NOW)).toBe('NOT_OPEN');
  });

  it('reads the clock when no `now` is passed', () => {
    expect(podScanWindow({ pod_date_time: new Date(Date.now() + HOUR).toISOString() })).toBe('NOT_OPEN');
  });
});

describe('canScanPodTickets', () => {
  it('offers the scanner only while the door is open', () => {
    expect(canScanPodTickets({ pod_date_time: at(2 * HOUR) }, NOW)).toBe(false);
    expect(canScanPodTickets({ pod_date_time: at(LEAD) }, NOW)).toBe(true);
    expect(canScanPodTickets({ pod_date_time: at(-HOUR), pod_end_date_time: at(HOUR) }, NOW)).toBe(true);
  });

  it('closes the scanner once the pod is over', () => {
    expect(canScanPodTickets({ pod_date_time: at(-5 * HOUR), pod_end_date_time: at(-4 * HOUR) }, NOW)).toBe(
      false,
    );
  });

  it('reads the clock when no `now` is passed', () => {
    expect(canScanPodTickets({ pod_date_time: new Date(Date.now() - HOUR).toISOString() })).toBe(true);
  });
});

describe('canCompletePod', () => {
  // Completing settles the payout off the seats scanned in, so it opens only in
  // the last POD_COMPLETE_LEAD_MINUTES of the pod — once the guests are in.
  const COMPLETE_LEAD = POD_COMPLETE_LEAD_MINUTES * 60 * 1000;

  it('opens fifteen minutes before the end', () => {
    expect(POD_COMPLETE_LEAD_MINUTES).toBe(15);
  });

  it('offers Complete on a pod that is over', () => {
    expect(canCompletePod({ pod_date_time: at(-5 * HOUR), pod_end_date_time: at(-4 * HOUR) }, NOW)).toBe(
      true,
    );
  });

  it('offers nothing on a pod that has not started', () => {
    expect(canCompletePod({ pod_date_time: at(2 * HOUR) }, NOW)).toBe(false);
  });

  it('offers nothing while the pod is running and more than the lead from its end', () => {
    expect(canCompletePod({ pod_date_time: at(-HOUR), pod_end_date_time: at(HOUR) }, NOW)).toBe(false);
    // One minute outside the lead is still too early.
    const end = COMPLETE_LEAD + 60_000;
    expect(canCompletePod({ pod_date_time: at(-HOUR), pod_end_date_time: at(end) }, NOW)).toBe(false);
  });

  it('offers Complete inside the last fifteen minutes of a running pod', () => {
    const end = COMPLETE_LEAD - 60_000;
    expect(canCompletePod({ pod_date_time: at(-HOUR), pod_end_date_time: at(end) }, NOW)).toBe(true);
  });

  it('never opens before the start, even on a pod shorter than the lead', () => {
    // Starts in 5 minutes, ends in 10: inside the lead of its end, but not begun.
    const pod = { pod_date_time: at(5 * 60_000), pod_end_date_time: at(10 * 60_000) };
    expect(canCompletePod(pod, NOW)).toBe(false);
  });

  it('measures the lead from the 4h tail when the host set no end', () => {
    const almostOver = -(POD_LIVE_TAIL_MS - COMPLETE_LEAD + 60_000);
    expect(canCompletePod({ pod_date_time: at(almostOver) }, NOW)).toBe(true);
    expect(canCompletePod({ pod_date_time: at(-HOUR) }, NOW)).toBe(false);
  });

  it('never opens on a pod with no usable start', () => {
    expect(canCompletePod({ pod_date_time: null }, NOW)).toBe(false);
  });

  it('reads the clock when no `now` is passed', () => {
    expect(canCompletePod({ pod_date_time: new Date(Date.now() + HOUR).toISOString() })).toBe(false);
  });
});

describe('canAmendPod', () => {
  // Editing, re-hosting and cancelling all change a PLAN. On a pod that has
  // already run there is no plan left to change — an edit would rewrite an
  // event people attended, and a cancellation would refund seats that were used.
  it('lets the host amend a pod that has not started', () => {
    expect(canAmendPod({ pod_date_time: at(2 * HOUR) }, NOW)).toBe(true);
  });

  it('still lets the host amend a pod that is running', () => {
    expect(canAmendPod({ pod_date_time: at(-HOUR), pod_end_date_time: at(HOUR) }, NOW)).toBe(true);
  });

  it('freezes the plan once the pod is over', () => {
    expect(canAmendPod({ pod_date_time: at(-5 * HOUR), pod_end_date_time: at(-4 * HOUR) }, NOW)).toBe(
      false,
    );
  });

  it('reads the clock when no `now` is passed', () => {
    expect(canAmendPod({ pod_date_time: new Date(Date.now() + HOUR).toISOString() })).toBe(true);
  });
});

describe('withinHappeningNearbyWindow', () => {
  const DAY = 24 * HOUR;
  const pods = [
    { id: 'DUN-POD-4821', pod_date_time: at(2 * HOUR) },
    { id: 'DUN-POD-4822', pod_date_time: at(7 * DAY) },
    { id: 'DUN-POD-4823', pod_date_time: at(7 * DAY + HOUR) },
    { id: 'DUN-POD-4824', pod_date_time: at(30 * DAY) },
    { id: 'DUN-POD-4825', pod_date_time: null },
    { id: 'DUN-POD-4826', pod_date_time: 'not a date' },
  ];
  const ids = (list: { id: string }[]) => list.map((pod) => pod.id);

  it('keeps only the pods starting within the next week, the last instant included', () => {
    expect(ids(withinHappeningNearbyWindow(pods, 7, NOW))).toEqual(['DUN-POD-4821', 'DUN-POD-4822']);
  });

  it('reaches as far as the admin sets', () => {
    expect(ids(withinHappeningNearbyWindow(pods, 30, NOW))).toEqual([
      'DUN-POD-4821',
      'DUN-POD-4822',
      'DUN-POD-4823',
      'DUN-POD-4824',
    ]);
  });

  it('reads a missing or non-positive window as the default week, never as "nothing"', () => {
    expect(DEFAULT_HAPPENING_NEARBY_DAYS).toBe(7);
    expect(ids(withinHappeningNearbyWindow(pods, 0, NOW))).toEqual(['DUN-POD-4821', 'DUN-POD-4822']);
    expect(ids(withinHappeningNearbyWindow(pods, Number.NaN, NOW))).toEqual(['DUN-POD-4821', 'DUN-POD-4822']);
  });

  it('reads the clock when no `now` is passed', () => {
    expect(withinHappeningNearbyWindow([{ pod_date_time: new Date(Date.now() + HOUR).toISOString() }], 7)).toHaveLength(1);
  });
});

describe('nothingUpcoming', () => {
  it('is true when every pod is over', () => {
    const over = [
      { pod_date_time: at(-5 * HOUR), pod_end_date_time: at(-4 * HOUR) },
      { pod_date_time: at(-10 * HOUR), pod_end_date_time: null },
    ];
    expect(nothingUpcoming(over, NOW)).toBe(true);
  });

  it('is true for an empty list — nothing is coming up', () => {
    expect(nothingUpcoming([], NOW)).toBe(true);
  });

  it('is false while any pod is still to come', () => {
    expect(
      nothingUpcoming(
        [
          { pod_date_time: at(-5 * HOUR), pod_end_date_time: at(-4 * HOUR) },
          { pod_date_time: at(HOUR), pod_end_date_time: at(2 * HOUR) },
        ],
        NOW,
      ),
    ).toBe(false);
  });

  it('is false while a pod is running, up to and including its end', () => {
    expect(nothingUpcoming([{ pod_date_time: at(-HOUR), pod_end_date_time: at(HOUR) }], NOW)).toBe(false);
    expect(nothingUpcoming([{ pod_date_time: at(-HOUR), pod_end_date_time: at(0) }], NOW)).toBe(false);
  });

  it('counts an undated pod as still to come', () => {
    expect(nothingUpcoming([{ pod_date_time: null }], NOW)).toBe(false);
  });

  it('reads the clock when no `now` is passed', () => {
    const past = new Date(Date.now() - 10 * HOUR).toISOString();
    const future = new Date(Date.now() + HOUR).toISOString();
    expect(nothingUpcoming([{ pod_date_time: past, pod_end_date_time: past }])).toBe(true);
    expect(nothingUpcoming([{ pod_date_time: future }])).toBe(false);
  });
});
