/**
 * Studio "modes" the account drawer + header switch between. A mode maps to a
 * role the user must hold (USER is always available). The active mode drives the
 * sidebar menu and the header studio badge.
 *
 * mWeb and the native app render this with MUI and Tamagui respectively, but the
 * RULE — which modes a person may switch into — is one thing, and lives here so
 * the two cannot disagree about whether a studio exists (rules 27 + 40).
 *
 * The WORDS are not here. Each app keeps its own `STUDIO_LABEL` beside its own
 * landing map (mWeb has paths, native has route names), so this module holds no
 * user-facing copy at all.
 */
export type StudioMode = 'USER' | 'HOST' | 'VENUE' | 'ECOMM' | 'CLUB';

export interface StudioOption {
  mode: StudioMode;
  /** Role the user must hold to access this mode (USER has none). */
  role?: string;
}

/** The catalogue, in switcher order. Render each one through the app's own
 * `STUDIO_LABEL[option.mode]`. */
export const STUDIO_OPTIONS: readonly StudioOption[] = [
  { mode: 'USER' },
  { mode: 'HOST', role: 'HOST' },
  { mode: 'VENUE', role: 'VENUE_OWNER' },
  { mode: 'ECOMM', role: 'ECOMM_MANAGER' },
  { mode: 'CLUB', role: 'CLUB_ADMIN' },
];

export interface StudioModeAccess {
  /**
   * The `is_product_visible` system flag. Off, and the E-commerce studio is not
   * offered at all — its landing page is gated, so switching into it would only
   * bounce the partner back home. Defaults to on so a caller that has no reason
   * to know about products keeps behaving exactly as before.
   */
  products?: boolean;
}

/** Modes a user with these roles can switch into (always includes USER). */
export function availableModes(roles: string[], access?: StudioModeAccess): StudioOption[] {
  const products = access?.products !== false;
  return STUDIO_OPTIONS.filter((option) => {
    if (option.mode === 'ECOMM' && !products) return false;
    return !option.role || roles.includes(option.role);
  });
}

/** Falls a persisted mode back to USER when the user no longer qualifies for it —
 * including an ECOMM mode saved before products were switched off. */
export function resolveMode(
  mode: StudioMode,
  roles: string[],
  access?: StudioModeAccess
): StudioMode {
  return availableModes(roles, access).some((option) => option.mode === mode) ? mode : 'USER';
}
