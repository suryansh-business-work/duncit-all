import type { ConfidenceSignal, ISignalWeight } from './testsOverview.model';

export type ConfidenceBand = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

/** One signal's 0-100 reading; null when that kind of testing has no data yet. */
export interface SignalReading {
  signal: ConfidenceSignal;
  value: number | null;
}

export interface ScoredSignal extends SignalReading {
  weight: number;
  /** Points this signal adds to the score; null when it was left out. */
  contribution: number | null;
}

export interface ConfidenceResult {
  score: number | null;
  band: ConfidenceBand;
  signals: ScoredSignal[];
}

interface Bands {
  high_min: number;
  medium_min: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const clampPct = (n: number) => Math.min(100, Math.max(0, n));

/** `part / whole` as a 0-100 percentage, or null when there is nothing to divide. */
export function pct(part: number, whole: number): number | null {
  return whole > 0 ? round1(clampPct((part / whole) * 100)) : null;
}

export function bandOf(score: number | null, bands: Bands): ConfidenceBand {
  if (score === null) return 'UNKNOWN';
  if (score >= bands.high_min) return 'HIGH';
  if (score >= bands.medium_min) return 'MEDIUM';
  return 'LOW';
}

/**
 * The confidence score: the weighted mean of every signal that has a reading
 * and a weight above zero. A signal with no data is left out and the weights
 * of the others renormalise — a console with no stress runs yet is not marked
 * down for it, and the dashboard says which signals were missing.
 */
export function confidence(readings: SignalReading[], weights: ISignalWeight[], bands: Bands): ConfidenceResult {
  const weightOf = new Map(weights.map((w) => [w.signal, w.weight]));
  const counted = readings.filter((r) => r.value !== null && (weightOf.get(r.signal) ?? 0) > 0);
  const totalWeight = counted.reduce((sum, r) => sum + (weightOf.get(r.signal) ?? 0), 0);

  const signals = readings.map((r) => {
    const weight = weightOf.get(r.signal) ?? 0;
    const isCounted = totalWeight > 0 && r.value !== null && weight > 0;
    return { ...r, weight, contribution: isCounted ? round1(((r.value ?? 0) * weight) / totalWeight) : null };
  });
  const score = totalWeight > 0 ? round1(signals.reduce((sum, s) => sum + (s.contribution ?? 0), 0)) : null;
  return { score, band: bandOf(score, bands), signals };
}

/** REGRESSION_FREE: 100 with no regressed tests, minus `penalty` points per regression. */
export function regressionFree(regressed: number | null, penalty: number): number | null {
  return regressed === null ? null : clampPct(100 - regressed * penalty);
}
