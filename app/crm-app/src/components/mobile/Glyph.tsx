import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from 'tamagui';

import { MOBILE } from '@/constants/design';
import type { IconName } from './EmptyState';

/** A Material icon, or one from the community set for brand marks (WhatsApp). */
export type AnyIcon =
  | { set?: 'material'; name: IconName }
  | { set: 'community'; name: keyof typeof MaterialCommunityIcons.glyphMap };

interface Props {
  icon: AnyIcon;
  /** A literal colour (the header's tint); otherwise the theme key `ink`. */
  color?: string;
  ink?: 'color' | 'muted' | 'onPrimarySoft' | 'accentText' | 'danger';
  size?: number;
}

/** One icon from either set in a theme colour; decorative, so screen readers skip it. */
export function Glyph({ icon, color, ink = 'color', size = MOBILE.icon }: Readonly<Props>) {
  const theme = useTheme();
  const tint = color ?? theme[ink]?.val;
  return icon.set === 'community' ? (
    <MaterialCommunityIcons name={icon.name} size={size} color={tint} accessibilityElementsHidden />
  ) : (
    <MaterialIcons name={icon.name} size={size} color={tint} accessibilityElementsHidden />
  );
}
