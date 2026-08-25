import { autoPodModeCount, type AutoPodActionCounts } from '@duncit/utils';

/** Studio "modes" the account drawer + header switch between. Each non-USER mode
 * maps to a role the user must hold. The active mode drives the sidebar menu and
 * the header studio badge — the RN twin of mWeb's `studio-mode.ts`. */
export type StudioMode = 'USER' | 'HOST' | 'VENUE' | 'ECOMM' | 'CLUB';

export interface StudioOption {
  mode: StudioMode;
  label: string;
  /** Role required to access this mode (USER has none). */
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

/** Landing screen for each mode — switching roles jumps straight to its dashboard. */
export const STUDIO_HOME_ROUTE = {
  USER: 'Home',
  HOST: 'HostManage',
  VENUE: 'VenueManage',
  ECOMM: 'ProductsManage',
  CLUB: 'ClubManage',
} as const;

/** The Auto Pod queue each enrolling mode owns. USER and ECOMM have none. */
export const AUTO_POD_ROUTE = {
  VENUE: 'VenueAutoPods',
  HOST: 'HostAutoPods',
  CLUB: 'ClubAutoPods',
} as const;

/** Any screen a role switch can land on. */
export type StudioSwitchRoute =
  (typeof STUDIO_HOME_ROUTE)[StudioMode] | (typeof AUTO_POD_ROUTE)[keyof typeof AUTO_POD_ROUTE];

/**
 * Where switching into `mode` should land.
 *
 * An Auto Pod waiting on a partner is time-critical — a venue's slot, a host's
 * evening and a club's pod all hang on someone enrolling — so when the mode
 * being switched into has any waiting, the switch goes straight to its queue
 * instead of its dashboard. Every other switch lands on the usual home.
 *
 * Counts are read from state the caller already fetched, never awaited here, so
 * a switch never stalls on the network; unloaded counts simply fall through to
 * the static home.
 */
export function studioSwitchRoute(
  mode: StudioMode,
  counts: AutoPodActionCounts | null | undefined,
): StudioSwitchRoute {
  const home = STUDIO_HOME_ROUTE[mode];
  if (autoPodModeCount(counts, mode) <= 0) return home;
  return AUTO_POD_ROUTE[mode as keyof typeof AUTO_POD_ROUTE] ?? home;
}
