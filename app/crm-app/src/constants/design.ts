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
