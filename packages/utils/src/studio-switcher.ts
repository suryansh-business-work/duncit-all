/**
 * The Studio — the ONE page (mWeb) / screen (native) that lists a partner
 * role's options, with the role switcher at its top. Which roles that switcher
 * offers, which role the Studio opens on, and what the single sidebar entry
 * points at are one rule, kept here so the two apps cannot disagree (rule 56).
 *
 * Framework-free: every word is a translation KEY, and the destination is the
 * role's own Options entry from `studio-options` (an mWeb path, a native
 * route, a Partner console path).
 */
import { availableModes, type StudioMode, type StudioModeAccess } from './studio-mode';
import {
  STUDIO_OPTIONS_ENTRY,
  type PartnerStudioMode,
  type StudioOptionsEntry,
} from './studio-options';

/** The short name of each role on the Studio's switcher. */
export const STUDIO_ROLE_LABEL_KEY: Readonly<Record<PartnerStudioMode, string>> = {
  HOST: 'mweb.studioOptions.roleHost',
  VENUE: 'mweb.studioOptions.roleVenue',
  ECOMM: 'mweb.studioOptions.roleBrand',
  CLUB: 'mweb.studioOptions.roleClub',
};

/**
 * The partner roles the Studio's switcher offers, in switcher order — only the
 * ones the user holds, and never the E-commerce studio while products are off
 * (`access.products`, the same gate the role switch itself applies).
 */
export function heldStudioModes(
  roles: readonly string[],
  access?: StudioModeAccess,
): PartnerStudioMode[] {
  return availableModes([...roles], access)
    .map((option) => option.mode)
    .filter((mode): mode is PartnerStudioMode => mode !== 'USER');
}

/**
 * The role the Studio opens on: the remembered mode while the user still holds
 * it, otherwise the first role they hold. `null` for a user with no partner
 * role — they have no Studio.
 */
export function studioModeFor(
  mode: StudioMode,
  roles: readonly string[],
  access?: StudioModeAccess,
): PartnerStudioMode | null {
  const held = heldStudioModes(roles, access);
  return held.find((candidate) => candidate === mode) ?? held[0] ?? null;
}

/**
 * The single "Studio" sidebar entry: one row for every partner, whichever role
 * is active, opening the Studio on `studioModeFor`. `null` without a partner
 * role, so a consumer's sidebar carries no Studio row at all.
 */
export function studioEntryFor(
  mode: StudioMode,
  roles: readonly string[],
  access?: StudioModeAccess,
): StudioOptionsEntry | null {
  const target = studioModeFor(mode, roles, access);
  if (target === null) return null;
  return {
    ...STUDIO_OPTIONS_ENTRY[target],
    labelKey: 'mweb.studioOptions.studioEntry',
    hintKey: 'mweb.studioOptions.studioEntryHint',
  };
}
