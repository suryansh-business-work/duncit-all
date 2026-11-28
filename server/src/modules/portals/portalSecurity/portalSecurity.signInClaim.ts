import {
  CRM_APP_CLIENT,
  CRM_PORTAL_KEY,
  crmAppSecurityVerificationOn,
} from '@modules/crm/crmApp/crmAppSettings.service';
import { pendingClaimFor, type PortalSessionClaim } from './portalSecurity.claims';

/**
 * The claim a sign-in is minted with, given who is signing in from where.
 *
 * Every console sign-in owes the Security Verification screen (`pendingClaimFor`)
 * with one exception: a CRM manager can turn the screen off for the Duncit CRM
 * app (CRM › CRM Mobile App › Settings). A sign-in from that app then gets no
 * claim and is a session straight away; the CRM web portal still asks.
 *
 * The app is told apart by the `x-duncit-app` header it sends. That header is
 * the client's word, so the exception is only as strong as the setting: it
 * opens nothing while the screen is on, and the password, the 2-step code and
 * the CRM role check all still run before any token exists.
 */
export async function signInClaimFor(
  portalKey: string | null | undefined,
  signIn?: { app?: string | null } | null
): Promise<PortalSessionClaim | undefined> {
  const claim = pendingClaimFor(portalKey);
  if (claim?.portal !== CRM_PORTAL_KEY || signIn?.app !== CRM_APP_CLIENT) return claim;
  return (await crmAppSecurityVerificationOn()) ? claim : undefined;
}
