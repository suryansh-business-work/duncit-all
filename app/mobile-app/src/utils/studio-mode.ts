import { autoPodModeCount, type AutoPodActionCounts, type StudioMode } from '@duncit/utils';

/**
 * The mode rules themselves — which studios exist, which a person may switch
 * into, and how a persisted mode falls back — live in @duncit/utils, so mWeb and
 * the native app cannot disagree about whether a studio exists (rules 27 + 40).
 * Re-exported here so every existing import of this module keeps working; what
 * stays below is the half that genuinely differs: native lands on route names.
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

/** Each mode's dashboard. A role switch lands on the role's Studio screen
 * instead ({@link studioSwitchRoute}). */
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

/**
 * The Studio screen of each partner role — every option of the role, with the
 * role switcher at its top. The names are the shared catalogue's own
 * (`STUDIO_OPTIONS_ENTRY[mode].route`); studio-mode.test pins the two together.
 */
export const STUDIO_ROUTE = {
  HOST: 'HostOptions',
  VENUE: 'VenueOptions',
  ECOMM: 'BrandOptions',
  CLUB: 'ClubOptions',
} as const;

/** Any screen a role switch can land on. */
export type StudioSwitchRoute =
  | (typeof STUDIO_HOME_ROUTE)['USER']
  | (typeof STUDIO_ROUTE)[keyof typeof STUDIO_ROUTE]
  | (typeof AUTO_POD_ROUTE)[keyof typeof AUTO_POD_ROUTE];

/**
 * Where switching into `mode` should land.
 *
 * A switch lands on the role's Studio screen. An Auto Pod waiting on a partner
 * is time-critical — a venue's slot, a host's evening and a club's pod all hang
 * on someone enrolling — so when the mode being switched into has any waiting,
 * the switch goes straight to its queue instead. User mode goes Home.
 *
 * Counts are read from state the caller already fetched, never awaited here, so
 * a switch never stalls on the network; unloaded counts simply fall through to
 * the Studio screen.
 */
export function studioSwitchRoute(
  mode: StudioMode,
  counts: AutoPodActionCounts | null | undefined,
): StudioSwitchRoute {
  const studio = mode === 'USER' ? STUDIO_HOME_ROUTE.USER : STUDIO_ROUTE[mode];
  if (autoPodModeCount(counts, mode) <= 0) return studio;
  return AUTO_POD_ROUTE[mode as keyof typeof AUTO_POD_ROUTE] ?? studio;
}
