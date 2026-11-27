import { Platform } from 'react-native';
import { radii } from '@duncit/auth-tokens';
import { tokens } from '@duncit/theme/tokens';

/**
 * The console's corner radii (@duncit/theme), as the CRM portal uses them:
 * `sm` for buttons, fields and menu rows, `md` for cards, `lg` for dialogs,
 * and `pill` for chips and the sign-in fields.
 */
export const RADII = { ...tokens.radius, pill: radii.pill };

/**
 * The sign-in card and its tagline bar. The portal's login sets them in MUI
 * units (4 and 3) of the theme's shape radius, `radius.sm`.
 */
export const AUTH_RADII = { card: tokens.radius.sm * 4, bar: tokens.radius.sm * 3 };

/**
 * The mobile layer's sizes. A touch target is 48 dp on Android (Material) and
 * 44 pt on iOS (Human Interface Guidelines); everything a thumb presses meets
 * the platform's floor. Icons, avatars and the floating button scale from it.
 */
export const MOBILE = {
  touch: Platform.OS === 'ios' ? tokens.size.touchTarget : 48,
  icon: 22,
  iconSm: 18,
  avatar: 40,
  fab: 56,
  /** The gutter between the screen edge and its content. */
  gutter: 16,
  /** How long one beat of the skeleton's pulse lasts. */
  pulse: tokens.motion.slow * 4,
} as const;
