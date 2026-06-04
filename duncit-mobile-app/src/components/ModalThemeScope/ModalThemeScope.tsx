import type { ReactNode } from 'react';
import { Theme } from 'tamagui';

import { useThemeStore } from '@/stores/theme.store';

/**
 * Re-applies the active Tamagui theme inside a React Native `<Modal>`. On native
 * this is the theme only; the web counterpart (`ModalThemeScope.web.tsx`) also
 * restores the brand font, because react-native-web portals modal content to
 * `document.body` — outside the provider — where theme tokens and the inherited
 * font would otherwise fall back to browser defaults.
 */
export function ModalThemeScope({ children }: { children: ReactNode }) {
  const scheme = useThemeStore((s) => s.scheme);
  return <Theme name={scheme}>{children}</Theme>;
}
