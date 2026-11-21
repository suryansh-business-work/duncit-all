import type { RankSeries } from '../../components/charts/RankBars';
import { rankBy, type Ranking } from '../../components/charts/ranking';
import type { DashboardFeature, FeatureDay, FeaturesDashboard } from './queries';

/** The top features by `pick`, named by their label. */
export const rankFeatures = (
  features: readonly DashboardFeature[],
  pick: (feature: DashboardFeature) => number
): Ranking => rankBy(features, (feature) => feature.label, pick);

/** Percent of a feature's calls that failed, to one decimal. */
export const failureRate = (feature: Pick<DashboardFeature, 'calls' | 'failed_calls'>): number =>
  feature.calls === 0 ? 0 : Math.round((feature.failed_calls / feature.calls) * 1000) / 10;

/** Percent of all calls that came back with an answer (not failed, not skipped). */
export const answeredRate = (d: Pick<FeaturesDashboard, 'calls' | 'failed_calls' | 'skipped_calls'>): number =>
  d.calls === 0 ? 0 : Math.round(((d.calls - d.failed_calls - d.skipped_calls) / d.calls) * 100);

/** Average USD per call over the range. */
export const costPerCall = (d: Pick<FeaturesDashboard, 'calls' | 'cost_usd'>): number =>
  d.calls === 0 ? 0 : d.cost_usd / d.calls;

/** The calls-per-day stack: answered, failed and skipped are parts of each day's total. */
export function callSeries(
  days: readonly FeatureDay[],
  labels: { answered: string; failed: string; skipped: string }
): RankSeries[] {
  return [
    { label: labels.answered, data: days.map((day) => day.calls - day.failed_calls - day.skipped_calls) },
    { label: labels.failed, data: days.map((day) => day.failed_calls) },
    { label: labels.skipped, data: days.map((day) => day.skipped_calls) },
  ];
}
