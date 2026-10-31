import { occasionColorMode } from '@duncit/utils';

import { useOccasionStore } from '@/stores/occasion.store';
import { useThemeStore } from '@/stores/theme.store';

/**
 * The mode the app paints in: the viewer's choice, unless the live festive
 * look (Marketing → Occasions) pins one — Halloween is a night. Anything that
 * themes itself outside the root (modals, the sidebar, the auth screens, the
 * tour) reads this, so a pinned look never shows a light sheet over a dark app.
 */
export function useEffectiveScheme(): 'light' | 'dark' {
  const scheme = useThemeStore((s) => s.scheme);
  const look = useOccasionStore((s) => s.data?.occasionLive.theme ?? null);
  return occasionColorMode(scheme, look);
}

/** A festive look pins the mode right now, so the light/dark controls have nothing to change. */
export function useSchemeLocked(): boolean {
  const colorMode = useOccasionStore((s) => s.data?.occasionLive.theme?.color_mode);
  return colorMode === 'LIGHT' || colorMode === 'DARK';
}
