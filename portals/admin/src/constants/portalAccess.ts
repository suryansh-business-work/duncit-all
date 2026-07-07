// Single source of truth for portal-based access. Drives BOTH the Manage Roles
// dialog (portal-access section) and the Roles table's portal-link column, so
// the two stay in sync. Each console portal grants its role(s); the Duncit app
// expands to User (default + mandatory), Host, Venue Owner and E-commerce
// Manager — and ships on two surfaces (mWeb + Native), both listed under it.

export interface PortalRole {
  key: string;
  name: string;
  /** Granted by default and not removable (the base mWeb "User" role). */
  required?: boolean;
}

/** A live surface for a portal (a console may run on more than one URL). */
export interface PortalLink {
  label: string;
  url: string;
}

export interface PortalAccess {
  key: string;
  name: string;
  /** Primary URL — also the link shown against each role in the Roles table. */
  url: string;
  /** Extra surfaces that share the same access (e.g. the app's mWeb + Native). */
  links?: PortalLink[];
  roles: PortalRole[];
}

const url = (sub: string) => `https://${sub}.duncit.com/`;

export const PORTAL_ACCESS: PortalAccess[] = [
  {
    key: 'mweb',
    name: 'Duncit App',
    url: url('mweb'),
    // The same access powers both consumer surfaces — granting any role here
    // applies identically to the responsive web app and the native app.
    links: [
      { label: 'mWeb', url: url('mweb') },
      { label: 'Native', url: url('native') },
    ],
    roles: [
      { key: 'USER', name: 'User', required: true },
      { key: 'HOST', name: 'Host' },
      { key: 'VENUE_OWNER', name: 'Venue Owner' },
      { key: 'ECOMM_MANAGER', name: 'E-commerce Manager' },
      { key: 'CLUB_ADMIN', name: 'Club Admin' },
    ],
  },
  {
    key: 'admin',
    name: 'Admin',
    url: url('admin'),
    // Admin access = Super Admin only. Granting/revoking admins (with emails) is
    // managed from the dedicated Super Admins panel on the Roles page.
    roles: [{ key: 'SUPER_ADMIN', name: 'Super Admin' }],
  },
  { key: 'ads', name: 'Ads', url: url('ads'), roles: [{ key: 'ADS_MANAGER', name: 'Ads Manager' }] },
  { key: 'crm', name: 'CRM', url: url('crm'), roles: [{ key: 'CRM_MANAGER', name: 'CRM Manager' }] },
  { key: 'finance', name: 'Finance', url: url('finance'), roles: [{ key: 'FINANCE_MANAGER', name: 'Finance Manager' }] },
  { key: 'tech', name: 'Tech', url: url('tech'), roles: [{ key: 'TECH_MANAGER', name: 'Tech Manager' }] },
  { key: 'support', name: 'Support', url: url('support'), roles: [{ key: 'SUPPORT_MANAGER', name: 'Support Manager' }] },
  { key: 'website', name: 'Website', url: url('website'), roles: [{ key: 'WEBSITE_MANAGER', name: 'Website Manager' }] },
  { key: 'legal', name: 'Legal', url: url('legal'), roles: [{ key: 'LEGAL_MANAGER', name: 'Legal Manager' }] },
  { key: 'ai', name: 'AI', url: url('ai'), roles: [{ key: 'AI_MANAGER', name: 'AI Manager' }] },
  { key: 'products', name: 'Products', url: url('products'), roles: [{ key: 'PRODUCTS_MANAGER', name: 'Products Manager' }] },
  { key: 'marketing', name: 'Marketing', url: url('marketing'), roles: [{ key: 'MARKETING_MANAGER', name: 'Marketing Manager' }] },
  { key: 'hr', name: 'HR', url: url('hr'), roles: [{ key: 'HR_MANAGER', name: 'HR Manager' }] },
  { key: 'employee', name: 'Employee', url: url('employee'), roles: [{ key: 'EMPLOYEE', name: 'Employee' }] },
  { key: 'onboarding', name: 'Onboarding', url: url('onboarding'), roles: [{ key: 'ONBOARDING_MANAGER', name: 'Onboarding Manager' }] },
];

export interface RolePortalInfo {
  portalName: string;
  url: string;
}

const ROLE_INDEX: Record<string, RolePortalInfo> = Object.fromEntries(
  PORTAL_ACCESS.flatMap((p) => p.roles.map((r) => [r.key, { portalName: p.name, url: p.url }]))
);

/** Portal a role belongs to (for the Roles table link column). */
export const portalForRole = (roleKey: string): RolePortalInfo | undefined => ROLE_INDEX[roleKey];
