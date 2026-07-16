import { formatMoney as sharedFormatMoney } from '@duncit/utils';

const numberFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export const formatCount = (value: number): string => numberFmt.format(Number(value || 0));

export const formatMoney = (value: number, symbol: string): string =>
  sharedFormatMoney(value, { symbol });

export const formatPercent = (fraction: number): string => `${Math.round(Number(fraction || 0) * 100)}%`;

export const formatRating = (value: number): string => Number(value || 0).toFixed(1);
