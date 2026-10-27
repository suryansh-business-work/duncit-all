// Server-side login gate for the console portals. Each key equals the portal
// client's own `appConfig.key` and each role list equals that portal's own
// `requiredRoles` (portals/<name>/src/config/app-config.ts); `admin` has no
// app-config, so its list mirrors the ADMIN_ROLES gate in its LoginPage.
// SUPER_ADMIN passes every portal (checked in assertPortalLogin).
export const PORTAL_ROLE_REQUIREMENTS: Record<string, readonly string[]> = {
  admin: ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'SUPPORT_USER', 'FINANCE_USER'],
  ads: ['ADS_MANAGER'],
  ai: ['AI_MANAGER'],
  analytics: ['ANALYTICS_MANAGER'],
  // Its own staff role — ECOMM_MANAGER is the Partner Brand role, granted to
  // every approved brand partner, and must not open the pet store.
  'ecomm-portal': ['ECOMM_STORE_MANAGER'],
  localization: ['LOCALIZATION_MANAGER'],
  targets: ['TARGETS_MANAGER'],
  'gig-jobs': ['GIG_JOBS_MANAGER'],
  challenge: ['CHALLENGE_MANAGER'],
  communications: ['COMMUNICATIONS_MANAGER'],
  // The directory consoles. An Onboarding Manager opens the venue and
  // host ones too: reviewing an application and managing the venue it becomes
  // are the same screen now (one console, union of both), so gating them apart
  // would hand onboarding staff a console that refuses the half they own.
  clubs: ['ALL_CLUBS_ACCESS'],
  'club-admins': ['ALL_CLUB_ADMINS_ACCESS'],
  hosts: ['ALL_HOSTS_ACCESS', 'ONBOARDING_MANAGER'],
  pods: ['ALL_PODS_ACCESS'],
  venues: ['ALL_VENUES_ACCESS', 'ONBOARDING_MANAGER'],
  crm: ['CRM_MANAGER'],
  developers: ['DEVELOPERS_MANAGER'],
  employee: ['EMPLOYEE'],
  // FINANCE_USER is the read-only analyst seat (FINANCE_READER in rbac.ts).
  finance: ['FINANCE_MANAGER', 'FINANCE_USER'],
  hr: ['HR_MANAGER'],
  legal: ['LEGAL_MANAGER'],
  logs: ['LOGS_MANAGER'],
  marketing: ['MARKETING_MANAGER'],
  onboarding: ['ONBOARDING_MANAGER'],
  products: ['PRODUCTS_MANAGER'],
  'regional-club-admin': ['REGIONAL_CLUB_ADMIN'],
  support: ['SUPPORT_MANAGER', 'SUPPORT_USER'],
  tech: ['TECH_MANAGER'],
  'website-app': ['WEBSITE_MANAGER'],
  // MCP_USER may connect an AI client; MCP_MANAGER also sees everyone's usage
  // and owns the settings. Neither widens what the AI can do: every tool runs
  // with the person's own console roles.
  mcp: ['MCP_MANAGER', 'MCP_USER'],
  tests: ['TESTS_MANAGER'],
};

// Consumer + partner surfaces are never portal-gated at login.
export const PORTAL_GATE_EXEMPT_KEYS: ReadonlySet<string> = new Set([
  'mweb',
  'native',
  'partners',
]);
