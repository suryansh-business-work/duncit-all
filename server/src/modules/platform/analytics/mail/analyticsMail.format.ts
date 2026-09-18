import type { AnalyticsFormat, AnalyticsKpi } from '../entity/shapes';
import type { ReportCopy } from './analyticsMail.copy';

/**
 * How a report writes each number — the same rules the Analytics console
 * applies on screen (`portals/analytics/.../format.ts`), here because the
 * server takes no `@duncit/*` dependency (rule 40). A figure must read the
 * same in the mail as on the dashboard it links to.
 */

const LOCALE = 'en-IN';
const [COUNT, ONE_DECIMAL] = [0, 1].map((digits) => new Intl.NumberFormat(LOCALE, { maximumFractionDigits: digits }));
// WinAnsi has the em dash, so the PDF's built-in font draws it; it has no
// U+2212 minus, which is why a fall below is written with a plain hyphen.
const EM_DASH = '—';

interface DurationStep {
  /** The smallest duration, in milliseconds, written in this unit — and what it is divided by. */
  atLeast: number;
  format: Intl.NumberFormat;
}

const durationStep = (atLeast: number, unit: string, digits: number): DurationStep => ({
  atLeast,
  format: new Intl.NumberFormat(LOCALE, { style: 'unit', unit, unitDisplay: 'short', maximumFractionDigits: digits }),
});

/** Milliseconds, the unit everything under a second is written in. */
const MS_STEP = durationStep(1, 'millisecond', 0);

/** A duration in the largest unit that keeps it short — 850 ms, 12.4 sec, 38.5 min. Largest first. */
const DURATION_UNITS: readonly DurationStep[] = [durationStep(60_000, 'minute', 1), durationStep(1000, 'second', 1), MS_STEP];

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const i = Math.min(BYTE_UNITS.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** i;
  let digits = 2;
  if (i === 0 || value >= 100) digits = 0;
  else if (value >= 10) digits = 1;
  return `${Number.parseFloat(value.toFixed(digits))} ${BYTE_UNITS[i]}`;
}

function formatDuration(ms: number): string {
  const step = DURATION_UNITS.find((candidate) => ms >= candidate.atLeast) ?? MS_STEP;
  return step.format.format(ms / step.atLeast);
}

/** One value as the dashboards write it. `currency` is the symbol a money figure is prefixed with. */
export function formatAnalyticsValue(
  value: number | null | undefined,
  format: AnalyticsFormat,
  currency: string
): string {
  if (value === null || value === undefined) return EM_DASH;
  switch (format) {
    case 'CURRENCY':
      return `${currency}${COUNT.format(value)}`;
    case 'PERCENT':
      return `${ONE_DECIMAL.format(value)}%`;
    case 'RATING':
      return value > 0 ? value.toFixed(1) : EM_DASH;
    case 'DAYS':
    case 'DECIMAL':
      return ONE_DECIMAL.format(value);
    case 'BYTES':
      return formatBytes(value);
    case 'DURATION':
      return formatDuration(value);
    case 'GRADE':
      return value >= 1 ? String.fromCodePoint(64 + Math.round(value)) : EM_DASH;
    default:
      return COUNT.format(value);
  }
}

export type DeltaTone = 'good' | 'bad' | 'flat';

export interface ReportDelta {
  /** "+12.4% vs previous 30 days", or "Right now" for a live count. */
  text: string;
  /** Null for a live count, which has nothing to be better or worse than. */
  tone: DeltaTone | null;
}

function changeText(kpi: AnalyticsKpi, previous: number, copy: ReportCopy): string {
  const diff = kpi.value - previous;
  const sign = diff > 0 ? '+' : '-';
  if (kpi.format === 'PERCENT') {
    return copy.t('analytics.page.deltaPoints', { value: `${sign}${ONE_DECIMAL.format(Math.abs(diff))}` });
  }
  if (kpi.format === 'GRADE' || previous === 0) return `${sign}${ONE_DECIMAL.format(Math.abs(diff))}`;
  return copy.t('analytics.page.deltaPercent', {
    value: `${sign}${ONE_DECIMAL.format(Math.abs(diff / previous) * 100)}`,
  });
}

/** How a tile moved since the period before, in the dashboard's own words. */
export function kpiDelta(kpi: AnalyticsKpi, days: number, copy: ReportCopy): ReportDelta {
  if (kpi.previous === null) return { text: copy.t('analytics.page.liveCount'), tone: null };
  const since = copy.t('analytics.page.vsPrevious', { days });
  if (Math.abs(kpi.value - kpi.previous) < 0.05) {
    return { text: `${copy.t('analytics.page.noChange')} ${since}`, tone: 'flat' };
  }
  const rising = kpi.value > kpi.previous;
  return {
    text: `${changeText(kpi, kpi.previous, copy)} ${since}`,
    tone: rising === kpi.higher_is_better ? 'good' : 'bad',
  };
}
