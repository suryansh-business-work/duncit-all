import {
  STUDIO_OPTIONS_ENTRY,
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

/** The translation key of the words beside each mode — the header badge, the
 * switcher bubbles and the drawer title all render `t(STUDIO_LABEL_KEY[mode])`. */
export const STUDIO_LABEL_KEY: Record<StudioMode, string> = {
  USER: 'mweb.studioMode.user',
  HOST: 'mweb.studioMode.host',
  VENUE: 'mweb.studioMode.venue',
  ECOMM: 'mweb.studioMode.ecomm',
  CLUB: 'mweb.studioMode.club',
};

/** Each mode's dashboard. A role switch lands on the role's Studio page instead
 * ({@link studioSwitchPath}); this is where a flow that opens the dashboard
 * itself goes. */
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
 * A switch lands on the role's Studio page — every option of that role, with
 * the role switcher at its top. An Auto Pod waiting on the role IS the reason
 * they switched, so the switch opens that queue instead — the offer is a race,
 * and a page the partner has to navigate out of is a slot someone else takes.
 * Counts are read from an already-fetched cache, so nothing here waits on the
 * network: with none loaded (or none waiting) the Studio page is used.
 */
export function studioSwitchPath(
  mode: StudioMode,
  counts: AutoPodActionCounts | null | undefined
): string {
  const studio = studioPath(mode);
  if (autoPodModeCount(counts, mode) > 0) return AUTO_POD_PATH[mode] ?? studio;
  return studio;
}

/** The Studio page of a partner role — where its every option is listed and the
 * role can be switched again in place. User mode has no Studio: it goes Home. */
function studioPath(mode: StudioMode): string {
  return mode === 'USER' ? STUDIO_HOME_PATH.USER : STUDIO_OPTIONS_ENTRY[mode].path;
}
