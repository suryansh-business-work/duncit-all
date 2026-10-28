import type { Translate } from '@duncit/shell';
import type { ChipColor } from '../stress-testing/labels';
import type { FieldUsage, MonitorRange, OperationType } from './queries';

/**
 * Words for the codes the monitor sends. Every key is written out literally —
 * the localization gates read keys straight off the source.
 */

export const MONITOR_RANGES: readonly MonitorRange[] = [
  'LAST_HOUR',
  'LAST_6_HOURS',
  'LAST_24_HOURS',
  'LAST_7_DAYS',
  'LAST_30_DAYS',
];

export const DEFAULT_RANGE: MonitorRange = 'LAST_24_HOURS';

const RANGE_SET: ReadonlySet<string> = new Set(MONITOR_RANGES);

export const isMonitorRange = (value: string | null): value is MonitorRange => value !== null && RANGE_SET.has(value);

export function rangeLabel(t: Translate, range: MonitorRange): string {
  const labels: Record<MonitorRange, string> = {
    LAST_HOUR: t('tech.graphqlMonitor.rangeHour'),
    LAST_6_HOURS: t('tech.graphqlMonitor.range6Hours'),
    LAST_24_HOURS: t('tech.graphqlMonitor.range24Hours'),
    LAST_7_DAYS: t('tech.graphqlMonitor.range7Days'),
    LAST_30_DAYS: t('tech.graphqlMonitor.range30Days'),
  };
  return labels[range];
}

/** Short ranges are drawn with times, long ones with dates. */
export const isShortRange = (range: MonitorRange) => range === 'LAST_HOUR' || range === 'LAST_6_HOURS';

export function operationTypeLabel(t: Translate, type: OperationType | FieldUsage['kind']): string {
  const labels: Record<OperationType | FieldUsage['kind'], string> = {
    QUERY: t('tech.graphqlMonitor.typeQuery'),
    MUTATION: t('tech.graphqlMonitor.typeMutation'),
    SUBSCRIPTION: t('tech.graphqlMonitor.typeSubscription'),
    TYPE: t('tech.graphqlMonitor.typeObject'),
    UNKNOWN: t('tech.graphqlMonitor.typeUnknown'),
  };
  return labels[type] ?? type;
}

const OPERATION_TYPES: readonly OperationType[] = ['QUERY', 'MUTATION', 'SUBSCRIPTION', 'UNKNOWN'];
const FIELD_KINDS: readonly FieldUsage['kind'][] = ['QUERY', 'MUTATION', 'SUBSCRIPTION', 'TYPE'];

/** The operation types as table filter options. */
export const operationTypeOptions = (t: Translate) =>
  OPERATION_TYPES.map((type) => ({ value: type, label: operationTypeLabel(t, type) }));

/** The schema field kinds as table filter options. */
export const fieldKindOptions = (t: Translate) =>
  FIELD_KINDS.map((kind) => ({ value: kind, label: operationTypeLabel(t, kind) }));

const TYPE_COLOR: Record<OperationType | FieldUsage['kind'], ChipColor> = {
  QUERY: 'info',
  MUTATION: 'warning',
  SUBSCRIPTION: 'success',
  TYPE: 'default',
  UNKNOWN: 'error',
};

export const operationTypeColor = (type: OperationType | FieldUsage['kind']): ChipColor => TYPE_COLOR[type] ?? 'default';

/** Error rates at or past this read as a problem rather than noise. */
const ERROR_RATE_ALERT_PCT = 5;

export const errorRateColor = (pct: number): string | undefined => (pct >= ERROR_RATE_ALERT_PCT ? 'error.main' : undefined);

export const latencyColor = (ms: number, slowMs: number): string | undefined => (ms >= slowMs ? 'warning.main' : undefined);
