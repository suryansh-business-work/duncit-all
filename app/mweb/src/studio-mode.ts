/** Studio "modes" the account drawer + header can switch between. A mode maps to
 * a role the user must hold (USER is always available). The active mode drives
 * the sidebar menu and the header studio badge. */
export type StudioMode = 'USER' | 'HOST' | 'VENUE' | 'ECOMM' | 'CLUB';

export interface StudioOption {
  mode: StudioMode;
  label: string;
  /** Role the user must hold to access this mode (USER has none). */
  role?: string;
}

export const STUDIO_OPTIONS: readonly StudioOption[] = [
  { mode: 'USER', label: 'User' },
  { mode: 'HOST', label: 'Host Studio', role: 'HOST' },
  { mode: 'VENUE', label: 'Venue Studio', role: 'VENUE_OWNER' },
  { mode: 'ECOMM', label: 'ecomm', role: 'ECOMM_MANAGER' },
  { mode: 'CLUB', label: 'Club Admin', role: 'CLUB_ADMIN' },
];

export const STUDIO_LABEL: Record<StudioMode, string> = {
  USER: 'User',
  HOST: 'Host Studio',
  VENUE: 'Venue Studio',
  ECOMM: 'ecomm',
  CLUB: 'Club Admin',
};

/** Modes a user with these roles can switch into (always includes USER). */
export function availableModes(roles: string[]): StudioOption[] {
  return STUDIO_OPTIONS.filter((option) => !option.role || roles.includes(option.role));
}

/** Falls a persisted mode back to USER when the user no longer qualifies for it. */
export function resolveMode(mode: StudioMode, roles: string[]): StudioMode {
  return availableModes(roles).some((option) => option.mode === mode) ? mode : 'USER';
}

/** Landing page for each mode — switching roles jumps straight to its dashboard.
 * Club administration itself lives on the partner portal, so the club mode lands
 * on the one destination it does own in-app: its payouts. */
export const STUDIO_HOME_PATH: Record<StudioMode, string> = {
  USER: '/',
  HOST: '/host/manage',
  VENUE: '/venues/manage',
  ECOMM: '/products/manage',
  CLUB: '/host/wallet',
};
