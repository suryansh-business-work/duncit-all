import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { sectionByRole, sectionRoleFor, type PartnerRole } from '../../config/partner-sections';

/** Where the last studio a partner worked in is remembered, per browser. */
export const ACTIVE_STUDIO_KEY = 'partners_active_studio';

function readStored(): PartnerRole | null {
  try {
    // Only a value that still names a studio counts — a stale or hand-edited
    // entry falls back to the first studio rather than to nothing.
    return sectionByRole(globalThis.localStorage?.getItem(ACTIVE_STUDIO_KEY))?.role ?? null;
  } catch {
    // Storage blocked (private window, disabled site data): the studio simply
    // follows the route, and the account pages fall back to the first studio.
    return null;
  }
}

function writeStored(role: PartnerRole) {
  try {
    globalThis.localStorage?.setItem(ACTIVE_STUDIO_KEY, role);
  } catch {
    // Same as above — remembering the studio is a convenience, never required.
  }
}

/**
 * The studio the sidebar shows.
 *
 * A studio route names its own studio, so the sidebar can never disagree with
 * the page. The account pages (Wallet, Help, Verification) belong to no
 * studio; there the last studio the partner was in stays put, so opening
 * Wallet does not swap the menu out from under them.
 */
export function useActiveStudio(): PartnerRole | null {
  const { pathname } = useLocation();
  const fromRoute = sectionRoleFor(pathname);
  useEffect(() => {
    if (fromRoute) writeStored(fromRoute);
  }, [fromRoute]);
  return fromRoute ?? readStored();
}
