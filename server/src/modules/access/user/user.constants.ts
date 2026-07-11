export const ROLES = [
  'SUPER_ADMIN',
  'CITY_ADMIN',
  'ZONAL_ADMIN',
  'USER',
  'HOST',
  'VENUE_OWNER',
  'ECOMM_MANAGER',
  'CLUB_ADMIN',
  'SUPPORT_USER',
  'FINANCE_USER',
  'ADS_MANAGER',
  'CRM_MANAGER',
  'FINANCE_MANAGER',
  'TECH_MANAGER',
  'SUPPORT_MANAGER',
  'WEBSITE_MANAGER',
  'LEGAL_MANAGER',
  'AI_MANAGER',
  'PRODUCTS_MANAGER',
  'MARKETING_MANAGER',
  'HR_MANAGER',
  'EMPLOYEE',
  'ONBOARDING_MANAGER',
  'CHALLENGE_MANAGER',
  'DEVELOPERS_MANAGER',
] as const;

export type UserRole = (typeof ROLES)[number];

export const STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const;
export type UserStatus = (typeof STATUSES)[number];

// Access is portal-based: each role maps to exactly one console (or the app /
// admin scopes). Holding the role grants full access to that portal — there are
// no sub-permissions/resources/actions. This catalog seeds the Role collection
// and powers the admin role picker, so every assignable access lives here.
export interface RoleDefinition {
  key: UserRole;
  name: string;
  description: string;
}

export const ROLE_CATALOG: RoleDefinition[] = [
  { key: 'SUPER_ADMIN', name: 'Super Admin', description: 'Full access to every Duncit console.' },
  { key: 'CITY_ADMIN', name: 'City Admin', description: 'Manage an assigned city: users, venues and pods.' },
  { key: 'ZONAL_ADMIN', name: 'Zonal Admin', description: 'Manage an assigned zone.' },
  { key: 'USER', name: 'User', description: 'Standard Duncit app member.' },
  { key: 'HOST', name: 'Host', description: 'Hosts pods on the Duncit app.' },
  { key: 'VENUE_OWNER', name: 'Venue Owner', description: 'Owns and manages venues.' },
  { key: 'ECOMM_MANAGER', name: 'E-commerce Manager', description: 'Manages e-commerce operations.' },
  { key: 'CLUB_ADMIN', name: 'Club Admin', description: 'Manages assigned clubs and their pods from the Partners portal.' },
  { key: 'SUPPORT_USER', name: 'Support Agent', description: 'Support console access (agent level).' },
  { key: 'FINANCE_USER', name: 'Finance Analyst', description: 'Finance console access (analyst level).' },
  { key: 'ADS_MANAGER', name: 'Ads Manager', description: 'Ads console — ads.duncit.com.' },
  { key: 'CRM_MANAGER', name: 'CRM Manager', description: 'CRM console — crm.duncit.com.' },
  { key: 'FINANCE_MANAGER', name: 'Finance Manager', description: 'Finance console — finance.duncit.com.' },
  { key: 'TECH_MANAGER', name: 'Tech Manager', description: 'Tech console — tech.duncit.com.' },
  { key: 'SUPPORT_MANAGER', name: 'Support Manager', description: 'Support console — support.duncit.com.' },
  { key: 'WEBSITE_MANAGER', name: 'Website Manager', description: 'Website console — website.duncit.com.' },
  { key: 'LEGAL_MANAGER', name: 'Legal Manager', description: 'Legal console — legal.duncit.com.' },
  { key: 'AI_MANAGER', name: 'AI Manager', description: 'AI console — ai.duncit.com.' },
  { key: 'PRODUCTS_MANAGER', name: 'Products Manager', description: 'Products console — products.duncit.com.' },
  { key: 'MARKETING_MANAGER', name: 'Marketing Manager', description: 'Marketing console — marketing.duncit.com.' },
  { key: 'HR_MANAGER', name: 'HR Manager', description: 'HR console — hr.duncit.com.' },
  { key: 'EMPLOYEE', name: 'Employee', description: 'Employee self-service console.' },
  { key: 'ONBOARDING_MANAGER', name: 'Onboarding Manager', description: 'Partner/host onboarding console.' },
  { key: 'CHALLENGE_MANAGER', name: 'Challenge Manager', description: 'Challenges console — challenge.duncit.com.' },
  { key: 'DEVELOPERS_MANAGER', name: 'Developers Manager', description: 'Developer platform — API keys for the public venue API.' },
];

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
  crm: ['CRM_MANAGER'],
  developers: ['DEVELOPERS_MANAGER'],
  employee: ['EMPLOYEE'],
  finance: ['FINANCE_MANAGER'],
  hr: ['HR_MANAGER'],
  legal: ['LEGAL_MANAGER'],
  marketing: ['MARKETING_MANAGER'],
  onboarding: ['ONBOARDING_MANAGER'],
  products: ['PRODUCTS_MANAGER'],
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
