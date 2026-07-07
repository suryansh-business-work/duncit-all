const numberFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export const formatCount = (value: number): string => numberFmt.format(Number(value || 0));

export const formatMoney = (value: number, symbol: string): string =>
  `${symbol}${numberFmt.format(Math.round(Number(value || 0)))}`;

export const formatPercent = (fraction: number): string => `${Math.round(Number(fraction || 0) * 100)}%`;

export const formatRating = (value: number): string => Number(value || 0).toFixed(1);
