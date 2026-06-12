import { create } from 'zustand';

import { getStudioMode, setStudioMode } from '@/services/studio-mode';
import type { StudioMode } from '@/utils/studio-mode';

interface StudioModeState {
  mode: StudioMode;
  hydrated: boolean;
  /** Restore the persisted studio mode on launch. */
  hydrate: () => Promise<void>;
  /** Switch + persist the active studio mode. */
  setMode: (mode: StudioMode) => void;
}

/** Active studio mode (User / Host / Venue / ecomm) — persisted via secure-store,
 * mirroring `theme.store`. Drives the sidebar menu + header studio badge. */
export const useStudioModeStore = create<StudioModeState>((set) => ({
  mode: 'USER',
  hydrated: false,
  hydrate: async () => {
    const saved = await getStudioMode();
    set({ mode: saved ?? 'USER', hydrated: true });
  },
  setMode: (mode) => {
    set({ mode });
    setStudioMode(mode).catch(() => undefined);
  },
}));
