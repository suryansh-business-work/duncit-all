import type { useTranslation } from '@duncit/shell';

type Translate = ReturnType<typeof useTranslation>['t'];

/**
 * The one sentence a canvas chart says to a screen reader. A chart is a
 * picture, so without this a blind reader gets "image" and nothing else.
 */
export function rankSummary(
  t: Translate,
  title: string,
  labels: readonly string[],
  values: readonly number[],
  format: (value: number) => string
): string {
  if (labels.length === 0) return t('ai.charts.empty', { vars: { title } });
  return t('ai.charts.rankSummary', {
    vars: { title, count: labels.length, top: labels[0], value: format(values[0]) },
  });
}

/** The same for a per-day trend: its span and its total. */
export function trendSummary(
  t: Translate,
  title: string,
  days: readonly string[],
  total: string,
  formatDay: (day: string) => string
): string {
  if (days.length === 0) return t('ai.charts.empty', { vars: { title } });
  return t('ai.charts.trendSummary', {
    vars: { title, from: formatDay(days[0]), to: formatDay(days[days.length - 1]), total },
  });
}

/** A percentage as the console prints one. */
export const percent = (t: Translate) => (value: number) => t('ai.charts.percent', { vars: { value } });

/** Milliseconds as the AI Features pages print them. */
export const millis = (t: Translate) => (value: number) => t('ai.features.ms', { vars: { ms: Math.round(value) } });
