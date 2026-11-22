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
 * The partner studios that stay shut until the account's email is verified:
 * Host, Venue and Club Admin. The Brand studio is not gated.
 */
export const EMAIL_GATED_STUDIO_MODES: readonly PartnerStudioMode[] = ['HOST', 'VENUE', 'CLUB'];

/**
 * Whether opening `mode` must wait for a verified email. Only an explicit
 * `true` counts as verified, so a missing answer never opens a gated studio.
 */
export function studioNeedsVerifiedEmail(
  mode: StudioMode,
  isEmailVerified: boolean | null | undefined,
): boolean {
  if (isEmailVerified === true) return false;
  return EMAIL_GATED_STUDIO_MODES.some((gated) => gated === mode);
}

/** What the role switcher's confirm button does for the staged pick. */
export interface StudioSwitchConfirm {
  /** The pick is a gated studio on an unverified email: the button sends the
   * person to verify it instead of switching. */
  verifyEmail: boolean;
  /** Nothing to confirm: the pick is the role already active, and it is open. */
  disabled: boolean;
}

/** The role switcher's confirm button, the same in both apps. */
export function studioSwitchConfirm(
  pending: StudioMode,
  current: StudioMode,
  isEmailVerified: boolean | null | undefined,
): StudioSwitchConfirm {
  const verifyEmail = studioNeedsVerifiedEmail(pending, isEmailVerified);
  return { verifyEmail, disabled: !verifyEmail && pending === current };
}

/** The words of the "verify your email first" message both apps show when a
 * gated studio is opened, as translation keys. */
export const STUDIO_EMAIL_GATE_KEYS = {
  title: 'mweb.studioOptions.emailGateTitle',
  body: 'mweb.studioOptions.emailGateBody',
  action: 'mweb.studioOptions.emailGateAction',
  dismiss: 'mweb.studioOptions.emailGateDismiss',
} as const;

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
