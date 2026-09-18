import { useCallback } from 'react';
import { formatMoney } from '@duncit/utils';

import { useStoreSettings } from '../app/providers/StoreSettingsProvider';

/** Whole rupees print without paise; anything else keeps two decimals. */
export function formatStoreMoney(value: number, symbol: string): string {
  const amount = Number(value) || 0;
  return formatMoney(amount, { symbol, decimals: Number.isInteger(amount) ? 0 : 2 });
}

/** The ONE money formatter the store renders with, in the store's currency. */
export function useMoney(): (value: number) => string {
  const { currency_symbol: symbol } = useStoreSettings();
  return useCallback((value: number) => formatStoreMoney(value, symbol), [symbol]);
}
