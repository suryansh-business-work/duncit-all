export const ROLES = [
  'SUPER_ADMIN',
  'CITY_ADMIN',
  'ZONAL_ADMIN',
  'USER',
  'HOST',
  'VENUE_OWNER',
  'ECOMM_MANAGER',
  'CLUB_ADMIN',
  'REGIONAL_CLUB_ADMIN',
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
  // The directory consoles. Named for what they open rather than for a
  // job title, because that is what they grant: every venue, every club, every
  // club admin, every host — regardless of which city or club the holder sits
  // in. A CITY_ADMIN sees their own city; these see the lot.
  'ALL_VENUES_ACCESS',
  'ALL_CLUBS_ACCESS',
  'ALL_CLUB_ADMINS_ACCESS',
  'ALL_HOSTS_ACCESS',
  'ALL_PODS_ACCESS',
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
  { key: 'REGIONAL_CLUB_ADMIN', name: 'Regional Club Admin', description: 'Oversees a region of Club Admins from the Partners portal. Granted directly — there is no onboarding application for it.' },
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
  { key: 'ALL_VENUES_ACCESS', name: 'All Venues Access', description: 'Every venue on Duncit — venues.duncit.com.' },
  { key: 'ALL_CLUBS_ACCESS', name: 'All Clubs Access', description: 'Every club on Duncit — clubs.duncit.com.' },
  { key: 'ALL_CLUB_ADMINS_ACCESS', name: 'All Club Admins Access', description: 'Every club admin on Duncit — club-admins.duncit.com.' },
  { key: 'ALL_HOSTS_ACCESS', name: 'All Hosts Access', description: 'Every host on Duncit — hosts.duncit.com.' },
  { key: 'ALL_PODS_ACCESS', name: 'All Pods Access', description: 'Every pod on Duncit — pods.duncit.com.' },
];

// The portal login gate (PORTAL_ROLE_REQUIREMENTS / PORTAL_GATE_EXEMPT_KEYS /
// assertPortalLogin) now lives in @modules/portals.
