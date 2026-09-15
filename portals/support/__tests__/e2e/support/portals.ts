/**
 * The three staff portals this project drives, and where each one keeps what
 * the suite has to know about it.
 *
 * The key is also each console's `appConfig.key` — its `portal_key` on sign-in
 * and its `x-duncit-app` header — so one name picks all of it.
 */
export type StaffPortal = 'support' | 'legal' | 'pods';

interface PortalTarget {
  /** `appConfig.tokenKey` in the portal's src/config/app-config.ts. */
  tokenKey: string;
  /** Where the portal's preview serves. */
  origin: () => string;
}

const PORTALS: Readonly<Record<StaffPortal, PortalTarget>> = {
  support: { tokenKey: 'support_token', origin: () => String(Cypress.config('baseUrl')) },
  legal: { tokenKey: 'legal_token', origin: () => String(Cypress.env('LEGAL_URL')) },
  pods: { tokenKey: 'pods_token', origin: () => String(Cypress.env('PODS_URL')) },
};

/** The localStorage key the portal reads its session token from. */
export const portalTokenKey = (portal: StaffPortal): string => PORTALS[portal].tokenKey;

/** An absolute URL on the portal's own origin. */
export const portalUrl = (portal: StaffPortal, path: string): string => `${PORTALS[portal].origin()}${path}`;
