import { create } from 'zustand';

import { getThemePref, setThemePref, type ThemePref } from '@/services/theme';

interface ThemeState {
  scheme: ThemePref;
  hydrated: boolean;
  /** Restore the persisted light/dark choice on launch. */
  hydrate: () => Promise<void>;
  /** Flip light/dark and persist the new choice. */
  toggle: () => void;
}

/**
 * Light/dark theme state — the Zustand replacement for NativeWind's
 * `useColorScheme`. The persisted value (expo-secure-store) is restored on
 * launch and drives Tamagui's active theme.
 */
export const useThemeStore = create<ThemeState>((set, get) => ({
  scheme: 'light',
  hydrated: false,
  hydrate: async () => {
    const pref = await getThemePref();
    set({ scheme: pref ?? 'light', hydrated: true });
  },
  toggle: () => {
    const next: ThemePref = get().scheme === 'dark' ? 'light' : 'dark';
    set({ scheme: next });
    void setThemePref(next);
  },
}));
