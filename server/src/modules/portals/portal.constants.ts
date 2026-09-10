// Server-side login gate for the console portals. Each key equals the portal
// client's own `appConfig.key` and each role list equals that portal's own
// `requiredRoles` (portals/<name>/src/config/app-config.ts); `admin` has no
// app-config, so its list mirrors the ADMIN_ROLES gate in its LoginPage.
// SUPER_ADMIN passes every portal (checked in assertPortalLogin).
export const PORTAL_ROLE_REQUIREMENTS: Record<string, readonly string[]> = {
  admin: ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'SUPPORT_USER', 'FINANCE_USER'],
  ads: ['ADS_MANAGER'],
  ai: ['AI_MANAGER'],
  challenge: ['CHALLENGE_MANAGER'],
  // The four directory consoles. An Onboarding Manager opens the venue and
  // host ones too: reviewing an application and managing the venue it becomes
  // are the same screen now (one console, union of both), so gating them apart
  // would hand onboarding staff a console that refuses the half they own.
  clubs: ['ALL_CLUBS_ACCESS'],
  'club-admins': ['ALL_CLUB_ADMINS_ACCESS'],
  hosts: ['ALL_HOSTS_ACCESS', 'ONBOARDING_MANAGER'],
  venues: ['ALL_VENUES_ACCESS', 'ONBOARDING_MANAGER'],
  crm: ['CRM_MANAGER'],
  developers: ['DEVELOPERS_MANAGER'],
  employee: ['EMPLOYEE'],
  finance: ['FINANCE_MANAGER'],
  hr: ['HR_MANAGER'],
  legal: ['LEGAL_MANAGER'],
  marketing: ['MARKETING_MANAGER'],
  onboarding: ['ONBOARDING_MANAGER'],
  products: ['PRODUCTS_MANAGER'],
  'regional-club-admin': ['REGIONAL_CLUB_ADMIN'],
  support: ['SUPPORT_MANAGER'],
  tech: ['TECH_MANAGER'],
  'website-app': ['WEBSITE_MANAGER'],
};

// Consumer + partner surfaces are never portal-gated at login.
export const PORTAL_GATE_EXEMPT_KEYS: ReadonlySet<string> = new Set([
  'mweb',
  'native',
  'partners',
]);
