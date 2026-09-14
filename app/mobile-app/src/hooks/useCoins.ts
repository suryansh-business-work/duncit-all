import { useEffect } from 'react';

import { COIN_GOLD } from '@/constants/coin-gold';
import { useCoinBalanceStore, useCoinLedgerStore } from '@/stores/coin.store';
import { useThemeStore } from '@/stores/theme.store';
import { useRefreshRegistration } from '@/components/PullToRefresh';
import { fireAndForget } from '@/utils/fire-and-forget';

/** The readable gold for the active scheme — RN twin of mWeb's `coinGold(mode)`. */
export function useCoinGold(): string {
  return useThemeStore((s) => COIN_GOLD[s.scheme]);
}

/**
 * Duncit Coin balance for the sidebar card — read from the store the user info
 * request seeded, so opening the menu asks for nothing. It only asks when that
 * has not answered yet. The balance is re-read after the actions that move it
 * (`refreshCoinBalance`), never on a mount.
 */
export function useCoinBalance() {
  const data = useCoinBalanceStore((s) => s.data);
  const isLoading = useCoinBalanceStore((s) => s.isLoading);
  const fetch = useCoinBalanceStore((s) => s.fetch);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { balance: data?.myCoinBalance ?? null, isLoading };
}

/**
 * The balance a bill is about to spend — the one place it is re-read on mount
 * (and on a pull), because an expiry sweep or an admin adjustment can have
 * moved it since the session loaded. The RN twin of mWeb's checkout reading
 * `MyCoinBalance` with `cache-and-network`.
 */
export function useFreshCoinBalance() {
  const data = useCoinBalanceStore((s) => s.data);
  const refetch = useCoinBalanceStore((s) => s.refetch);

  useEffect(() => {
    fireAndForget(refetch());
  }, [refetch]);

  useRefreshRegistration(refetch);

  return data?.myCoinBalance ?? null;
}

/** Re-read the balance after an action that moved it: a payment, a gift card,
 * a pod rating, a referral. Everything reading the store picks it up. */
export function refreshCoinBalance(): void {
  fireAndForget(useCoinBalanceStore.getState().refetch());
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

  useRefreshRegistration(refetch);

  return {
    balance: data?.myCoinBalance ?? null,
    transactions: data?.myCoinTransactions ?? [],
    isLoading,
    error,
  };
}
