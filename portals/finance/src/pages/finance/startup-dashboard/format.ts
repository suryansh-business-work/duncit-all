import { formatMoney } from '@duncit/utils';

const num = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** Format a metric value for display based on its unit. */
export function formatMetricValue(value: number, unit: string): string {
  switch (unit) {
    case 'currency':
      return formatMoney(value, { compact: true });
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'months':
      return `${value.toFixed(1)} mo`;
    case 'minutes':
      return `${value.toFixed(0)} min`;
    case 'rating':
      return `${value.toFixed(1)} ★`;
    case 'boolean':
      return value >= 1 ? 'Yes' : 'No';
    default:
      return num.format(value);
  }
}

/** Pretty label for a raw setting key, e.g. cash_in_bank → "Cash In Bank". */
export function labelizeKey(key: string): string {
  return key
    .split('_')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');
}
