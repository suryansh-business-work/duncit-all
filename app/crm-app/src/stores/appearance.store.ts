import { create } from 'zustand';
import { fireAndForget, logs } from '@duncit/logs';

import { readValue, STORAGE_KEYS, writeValue } from '@/services/secure-storage';

export type ColorMode = 'light' | 'dark';

interface AppearanceState {
  /** The person's choice; null = follow the phone, as until they pick. */
  mode: ColorMode | null;
  hydrate: () => Promise<void>;
  /** Flip from the mode on screen now, and remember it — the portal's light/dark switch. */
  toggle: (current: ColorMode) => void;
}

const isMode = (value: string | null): value is ColorMode => value === 'light' || value === 'dark';

export const useAppearanceStore = create<AppearanceState>((set) => ({
  mode: null,
  hydrate: async () => {
    const saved = await readValue(STORAGE_KEYS.colorMode);
    if (isMode(saved)) set({ mode: saved });
  },
  toggle: (current) => {
    const mode: ColorMode = current === 'dark' ? 'light' : 'dark';
    set({ mode });
    fireAndForget(
      writeValue(STORAGE_KEYS.colorMode, mode),
      logs.mobileApp,
      'crm-app/appearance',
      'save',
    );
  },
}));

/** The mode the app shows: the saved choice, else the phone's. */
export const resolveColorMode = (
  saved: ColorMode | null,
  system: string | null | undefined,
): ColorMode => saved ?? (system === 'dark' ? 'dark' : 'light');
