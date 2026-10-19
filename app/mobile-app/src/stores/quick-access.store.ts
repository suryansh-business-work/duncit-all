import { create } from 'zustand';
import { logs } from '@duncit/logs';
import { QUICK_ACCESS_STORAGE_KEY, type ProfileMenuKey } from '@duncit/utils';

import { getItem, setItem } from '@/services/secure-storage';

interface QuickAccessState {
  /** The raw stored pick — `null` until read, or when never edited. It is
   * read back through `parseStoredQuickAccess` with the live flags, so a key a
   * flag has since switched off never reaches the grid. */
  raw: string | null;
  hydrated: boolean;
  /** Restore the saved pick. Safe to call any number of times. */
  hydrate: () => Promise<void>;
  /** Show `selection` now and keep it on the device. Resolves `false` when the
   * device would not keep it — the grid still shows it for this session. */
  save: (selection: readonly ProfileMenuKey[]) => Promise<boolean>;
}

let hydration: Promise<void> | null = null;

/** The member's Quick Access tiles in the account menu, kept per device like
 * the cart. mWeb twin: profile-drawer/useQuickAccess (localStorage). */
export const useQuickAccessStore = create<QuickAccessState>((set) => ({
  raw: null,
  hydrated: false,
  hydrate: () => {
    hydration ??= getItem(QUICK_ACCESS_STORAGE_KEY)
      .then((raw) => set({ raw, hydrated: true }))
      .catch((error: unknown) => {
        logs.mobileApp.warn('quickAccess', 'load', { error });
        set({ hydrated: true });
      });
    return hydration;
  },
  save: async (selection) => {
    const raw = JSON.stringify(selection);
    set({ raw });
    try {
      await setItem(QUICK_ACCESS_STORAGE_KEY, raw);
      return true;
    } catch (error) {
      logs.mobileApp.warn('quickAccess', 'persist', { error });
      return false;
    }
  },
}));
