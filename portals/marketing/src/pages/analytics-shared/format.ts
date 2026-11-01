import { formatMoney, formatINR } from '@duncit/utils';
import { formatDay, useTranslation } from '@duncit/app-settings';

type Translate = ReturnType<typeof useTranslation>['t'];

/** A server code as the label the rest of the console uses; a code with no label stays as it is. */
export const labelOf = (labels: Readonly<Record<string, string>>, code: string, t: Translate): string =>
  labels[code] ? t(labels[code]) : code;

/** The window's days as the chart axis reads them, in the admin's date settings. */
export const dayLabels = (days: readonly string[]) => days.map((day) => formatDay(day));

/** The number formats every analytics page shows its figures in. */
export function useFigures() {
  const { locale } = useTranslation();
  return {
    count: (value: number) => value.toLocaleString(locale),
    percent: (value: number) => `${value.toLocaleString(locale, { maximumFractionDigits: 2 })}%`,
    // The AI rate card prices in US dollars; link revenue is attributed in rupees.
    usd: (value: number) => formatMoney(value, { symbol: '$', decimals: 2 }),
    inr: (value: number) => formatINR(value),
  };
}

export type Figures = ReturnType<typeof useFigures>;
