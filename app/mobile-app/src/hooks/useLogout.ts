import { useAppPopupStore } from '@/stores/app-popup.store';
import { useAuthStore } from '@/stores/auth.store';
import { useCoinBalanceStore, useCoinLedgerStore } from '@/stores/coin.store';
import { useMeStore } from '@/stores/me.store';

/**
 * Clears the session — the single logout path shared by the header logout
 * button and the account drawer footer (DRY). Dropping the token flips the
 * navigation gate back to the auth group, so no imperative navigation is needed.
 */
export function useLogout() {
  const signOut = useAuthStore((s) => s.signOut);

  return async () => {
    await signOut();
    useMeStore.getState().reset();
    // The coin balance is per-account money, so it must not survive the session
    // and flash in the next user's sidebar while their own balance loads.
    useCoinBalanceStore.getState().reset();
    useCoinLedgerStore.getState().reset();
    // Which popups somebody has already closed is per-account, so the cached
    // answer must not decide what the NEXT user who signs in on this phone sees.
    useAppPopupStore.getState().reset();
  };
}
