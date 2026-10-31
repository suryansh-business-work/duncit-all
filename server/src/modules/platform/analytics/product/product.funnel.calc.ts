import { median } from '../entity/aggregates';
import { rate } from './product.counts';

/**
 * The funnel arithmetic, free of the database so it can be checked by hand.
 *
 * Each person enters at their FIRST occurrence of step 1 inside the period.
 * From there, each next step counts at its earliest occurrence at or after the
 * step before it, and no later than the conversion window after entry. Steps
 * are strictly ordered: a person who paid and then opened the pod page has not
 * converted from "pod page" to "paid".
 */

/** Per person: one ascending list of occurrence times (epoch ms) per step. */
export type StepTimes = ReadonlyArray<readonly number[]>;

export interface FunnelStepResult {
  /** People who reached this step in order. */
  entered: number;
  /** % of the step before's people who reached this one; null for the first step. */
  conversion_from_previous: number | null;
  /** % of the first step's people who reached this one. */
  conversion_from_start: number | null;
  /** People who reached the step before and stopped there; 0 for the first step. */
  dropped: number;
  /** The typical time from the step before to this one, ms; null for the first step or when nobody reached it. */
  median_ms_from_previous: number | null;
}

/** The earliest time in an ascending list that is ≥ `after` and ≤ `until`; null when none is. */
export function firstBetween(times: readonly number[], after: number, until: number): number | null {
  for (const time of times) {
    if (time > until) return null;
    if (time >= after) return time;
  }
  return null;
}

/** How far one person got, with the gap before each step they reached. */
export function journeyOf(steps: StepTimes, from: number, to: number, windowMs: number): number[] {
  const entry = firstBetween(steps[0] ?? [], from, to - 1);
  if (entry === null) return [];
  const reached = [entry];
  const deadline = entry + windowMs;
  for (let step = 1; step < steps.length; step += 1) {
    const at = firstBetween(steps[step], reached[step - 1], deadline);
    if (at === null) break;
    reached.push(at);
  }
  return reached;
}

export function computeFunnel(
  people: Iterable<StepTimes>,
  stepCount: number,
  bounds: { from: number; to: number },
  windowMs: number
): FunnelStepResult[] {
  const entered = new Array<number>(stepCount).fill(0);
  const gaps = Array.from({ length: stepCount }, () => [] as number[]);
  for (const steps of people) {
    const reached = journeyOf(steps, bounds.from, bounds.to, windowMs);
    reached.forEach((at, step) => {
      entered[step] += 1;
      if (step > 0) gaps[step].push(at - reached[step - 1]);
    });
  }
  return entered.map((count, step) => ({
    entered: count,
    conversion_from_previous: step === 0 ? null : rate(count, entered[step - 1]),
    conversion_from_start: rate(count, entered[0]),
    dropped: step === 0 ? 0 : entered[step - 1] - count,
    median_ms_from_previous: step === 0 || gaps[step].length === 0 ? null : median(gaps[step]),
  }));
}
