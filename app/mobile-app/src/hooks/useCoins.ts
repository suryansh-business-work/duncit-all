import { useEffect } from 'react';

import { COIN_GOLD } from '@/constants/coin-gold';
import { useCoinBalanceStore, useCoinLedgerStore } from '@/stores/coin.store';
import { useThemeStore } from '@/stores/theme.store';

/** The readable gold for the active scheme — RN twin of mWeb's `coinGold(mode)`. */
export function useCoinGold(): string {
  return useThemeStore((s) => COIN_GOLD[s.scheme]);
}

/**
 * Duncit Coin balance for the sidebar card. Refetches on mount so a payment made
 * this session is reflected while the cached value stays on screen — the RN twin
 * of mWeb's `cache-and-network`.
 */
export function useCoinBalance() {
  const data = useCoinBalanceStore((s) => s.data);
  const refetch = useCoinBalanceStore((s) => s.refetch);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { balance: data?.myCoinBalance ?? null };
}

/** Balance + the full coin ledger for the Duncit Coin screen. */
export function useCoinLedger() {
  const data = useCoinLedgerStore((s) => s.data);
  const isLoading = useCoinLedgerStore((s) => s.isLoading);
  const error = useCoinLedgerStore((s) => s.error);
  const refetch = useCoinLedgerStore((s) => s.refetch);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    balance: data?.myCoinBalance ?? null,
    transactions: data?.myCoinTransactions ?? [],
    isLoading,
    error,
  };
}
