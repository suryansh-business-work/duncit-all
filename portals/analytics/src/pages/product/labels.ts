import type { useTranslation } from '@duncit/app-settings';
import { PLATFORM_OPTIONS } from '../entity-analytics/FilterSelects';
import { formatValue } from '../entity-analytics/format';
import type { ProductCount } from './queries';

export type Translate = ReturnType<typeof useTranslation>['t'];

/** A platform's words; an unknown value reads as itself. */
export function platformLabel(value: string, t: Translate): string {
  const option = PLATFORM_OPTIONS.find((one) => one.value === value);
  return option ? t(option.label) : value;
}

/** Previous-screen counts, with the empty screen named as the start of a session. */
export const screenCounts = (rows: readonly ProductCount[], t: Translate) =>
  rows.map((row) => ({ key: row.key || t('analytics.product.sessionStart'), count: row.count }));

export const platformCounts = (rows: readonly ProductCount[], t: Translate) =>
  rows.map((row) => ({ key: platformLabel(row.key, t), count: row.count }));

export const asDuration = (ms: number | null | undefined) => formatValue(ms, 'DURATION');
export const asPercent = (value: number | null | undefined) => formatValue(value, 'PERCENT');
export const asCount = (value: number | null | undefined) => formatValue(value, 'COUNT');
