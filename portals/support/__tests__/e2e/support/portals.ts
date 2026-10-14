/**
 * The three staff portals this project drives, and where each one keeps what
 * the suite has to know about it.
 *
 * The key is also each console's `appConfig.key` — its `portal_key` on sign-in
 * and its `x-duncit-app` header — so one name picks all of it.
 */
export type StaffPortal =
  | 'support'
  | 'legal'
  | 'pods'
  | 'admin'
  | 'finance'
  | 'onboarding'
  | 'venues'
  | 'hosts'
  | 'clubs'
  | 'club-admins'
  | 'crm'
  | 'communications'
  | 'logs'
  | 'products'
  | 'ecomm-portal';

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
  admin: { tokenKey: 'admin_token', origin: () => String(Cypress.env('ADMIN_URL')) },
  finance: { tokenKey: 'finance_token', origin: () => String(Cypress.env('FINANCE_URL')) },
  onboarding: { tokenKey: 'onboarding_token', origin: () => String(Cypress.env('ONBOARDING_URL')) },
  venues: { tokenKey: 'venues_token', origin: () => String(Cypress.env('VENUES_URL')) },
  hosts: { tokenKey: 'hosts_token', origin: () => String(Cypress.env('HOSTS_URL')) },
  clubs: { tokenKey: 'clubs_token', origin: () => String(Cypress.env('CLUBS_URL')) },
  'club-admins': { tokenKey: 'club_admins_token', origin: () => String(Cypress.env('CLUB_ADMINS_URL')) },
  crm: { tokenKey: 'crm_token', origin: () => String(Cypress.env('CRM_URL')) },
  communications: { tokenKey: 'communications_token', origin: () => String(Cypress.env('COMMUNICATIONS_URL')) },
  logs: { tokenKey: 'logs_token', origin: () => String(Cypress.env('LOGS_URL')) },
  products: { tokenKey: 'products_token', origin: () => String(Cypress.env('PRODUCTS_URL')) },
  'ecomm-portal': { tokenKey: 'ecomm_portal_token', origin: () => String(Cypress.env('ECOMM_PORTAL_URL')) },
};

/** The localStorage key the portal reads its session token from. */
export const portalTokenKey = (portal: StaffPortal): string => PORTALS[portal].tokenKey;

/** An absolute URL on the portal's own origin. */
export const portalUrl = (portal: StaffPortal, path: string): string => `${PORTALS[portal].origin()}${path}`;
