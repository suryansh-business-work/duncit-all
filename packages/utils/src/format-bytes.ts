const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

/**
 * Human-readable bytes, e.g. 8589934592 -> "8 GB". Two significant decimals
 * under 10, one under 100, none above — and trailing zeros dropped.
 */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const i = Math.min(UNITS.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** i;
  let digits: number;
  if (i === 0 || value >= 100) digits = 0;
  else if (value >= 10) digits = 1;
  else digits = 2;
  // toFixed then parseFloat drops trailing zeros (8.00 -> 8, 0.090 -> 0.09).
  return `${Number.parseFloat(value.toFixed(digits))} ${UNITS[i]}`;
}
