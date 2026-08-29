import {
  autoPodModeCount,
  type AutoPodActionCounts,
  type StudioMode,
} from '@duncit/utils';

/**
 * The mode rules themselves — which studios exist, which a person may switch
 * into, and how a persisted mode falls back — live in @duncit/utils, so mWeb and
 * the native app cannot disagree about whether a studio exists (rules 27 + 40).
 * Re-exported here so every existing import of this module keeps working; what
 * stays below is the half that genuinely differs: mWeb lands on paths.
 */
export {
  STUDIO_OPTIONS,
  availableModes,
  resolveMode,
  type StudioMode,
  type StudioModeAccess,
  type StudioOption,
} from '@duncit/utils';

/** The words beside each mode — the header badge, the switcher bubbles and the
 * drawer title all read this map. */
export const STUDIO_LABEL: Record<StudioMode, string> = {
  USER: 'User',
  HOST: 'Host Studio',
  VENUE: 'Venue Studio',
  ECOMM: 'ecomm',
  CLUB: 'Club Admin',
};

/** Landing page for each mode — switching roles jumps straight to its dashboard. */
export const STUDIO_HOME_PATH: Record<StudioMode, string> = {
  USER: '/',
  HOST: '/host/manage',
  VENUE: '/venues/manage',
  ECOMM: '/products/manage',
  CLUB: '/clubs/manage',
};

/** The Auto Pod queue each partner mode owns. USER and ECOMM are absent because
 * neither enrols in an Auto Pod. */
export const AUTO_POD_PATH: Partial<Record<StudioMode, string>> = {
  VENUE: '/venues/auto-pods',
  HOST: '/host/auto-pods',
  CLUB: '/clubs/auto-pods',
};

/**
 * Where switching into `mode` actually lands.
 *
 * An Auto Pod waiting on the role IS the reason they switched, so the switch
 * opens that queue instead of the usual dashboard — the offer is a race, and a
 * dashboard the partner has to navigate out of is a slot someone else takes.
 * Counts are read from an already-fetched cache, so nothing here waits on the
 * network: with none loaded (or none waiting) the mode's home is used.
 */
export function studioSwitchPath(
  mode: StudioMode,
  counts: AutoPodActionCounts | null | undefined
): string {
  if (autoPodModeCount(counts, mode) > 0) return AUTO_POD_PATH[mode] ?? STUDIO_HOME_PATH[mode];
  return STUDIO_HOME_PATH[mode];
}
