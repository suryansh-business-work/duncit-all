import type { ReactNode } from 'react';
import { Theme } from 'tamagui';
import { typography } from '@duncit/auth-tokens';

import { useThemeStore } from '@/stores/theme.store';

/**
 * A React Native `<Modal>` portals its content to `document.body` on
 * react-native-web — outside the Tamagui provider — so the drawer/overlay loses
 * the theme's CSS variables and the inherited Quicksand font, falling back to
 * the browser defaults. Re-apply both here. `display: contents` keeps the
 * modal's own (absolutely positioned) layout untouched.
 */
export function ModalThemeScope({ children }: Readonly<{ children: ReactNode }>) {
  const scheme = useThemeStore((s) => s.scheme);
  return (
    <Theme name={scheme}>
      <div style={{ display: 'contents', fontFamily: typography.fontFamily }}>{children}</div>
    </Theme>
  );
}
