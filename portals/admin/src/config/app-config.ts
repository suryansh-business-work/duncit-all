/**
 * Per-app configuration for the Duncit Admin console. Single source of truth
 * that drives the shared `@duncit/shell` chrome (header/sidebar/search), login
 * gating and theme. Reusable configuration only — no dynamic business data.
 * The `key` is the stable portal identifier sent as `portal_key` on login.
 *
 * `requiredRoles` can be overridden at build/runtime via `VITE_REQUIRED_ROLES`
 * (comma separated) so access control stays dynamic without a code change.
 */
export interface AppNavItem {
  label: string;
  /** Route the item links to. Optional when the item is purely a group header. */
  to?: string;
  icon: string;
  /** Optional nested children — rendered as a collapsible group. */
  children?: AppNavItem[];
}

export interface SearchItem {
  label: string;
  to: string;
  keywords?: string[];
  section?: string;
}

export interface AppConfig {
  key: string;
  name: string;
  fullName: string;
  tagline: string;
  promoTitle: string;
  promoText: string;
  portalLabel: string;
  loginImage: string;
  requiredRoles: string[];
  tokenKey: string;
  colorModeKey: string;
  nav: AppNavItem[];
  searchItems: SearchItem[];
}

const envRoles = String(import.meta.env.VITE_REQUIRED_ROLES ?? '')
  .split(',')
  .map((role: string) => role.trim())
  .filter(Boolean);

export const appConfig: AppConfig = {
  key: 'admin',
  name: 'Admin',
  fullName: 'Duncit Admin',
  tagline: 'Operate the Duncit platform — one place.',
  promoTitle: 'One unified portal',
  promoText: 'Every team, every metric — one place. Sign in and get moving.',
  portalLabel: 'Admin Portal',
  loginImage:
    (import.meta.env.VITE_LOGIN_IMAGE as string | undefined) ||
    'https://images.pexels.com/photos/36713016/pexels-photo-36713016.jpeg',
  requiredRoles: envRoles.length
    ? envRoles
    : ['SUPER_ADMIN', 'CITY_ADMIN', 'ZONAL_ADMIN', 'SUPPORT_USER', 'FINANCE_USER'],
  tokenKey: 'admin_token',
  colorModeKey: 'admin_color_mode',
  nav: [
    { label: 'Dashboard', to: '/dashboard', icon: 'dashboard' },
    {
      label: 'User Management',
      icon: 'people',
      children: [
        { label: 'All Users', to: '/users', icon: 'people' },
        { label: 'Roles', to: '/rbac/roles', icon: 'shield' },
      ],
    },
    {
      label: 'Catalog',
      icon: 'inventory',
      children: [
        { label: 'Categories', to: '/categories', icon: 'accountTree' },
        { label: 'Locations', to: '/locations', icon: 'location' },
        { label: 'Sliders', to: '/sliders', icon: 'image' },
      ],
    },
    {
      label: 'Clubs',
      icon: 'community',
      children: [
        { label: 'All Clubs', to: '/clubs', icon: 'groups' },
        { label: 'Pods', to: '/pods', icon: 'calendar' },
        { label: 'Pod Ideas', to: '/pod-ideas', icon: 'insights' },
        { label: 'Pod Plans', to: '/pod-plans', icon: 'description' },
        { label: 'Coupons', to: '/coupons', icon: 'percent' },
        { label: 'Referrals', to: '/referrals', icon: 'percent' },
        { label: 'Event Tickets', to: '/event-tickets', icon: 'ticket' },
      ],
    },
    {
      label: 'Engagement',
      icon: 'campaign',
      children: [
        { label: 'FAQs', to: '/faqs', icon: 'help' },
        { label: 'Badges', to: '/badges', icon: 'shield' },
      ],
    },
    { label: 'Partner FAQs', to: '/partners/faqs', icon: 'help' },
    { label: 'Approvals', to: '/approvals', icon: 'survey' },
    {
      label: 'System',
      icon: 'settings',
      children: [
        { label: 'Branding', to: '/branding', icon: 'tune' },
        { label: 'Settings', to: '/settings', icon: 'settings' },
      ],
    },
  ],
  searchItems: [
    { label: 'Dashboard', to: '/dashboard', section: 'Dashboard' },
    {
      label: 'All Users',
      to: '/users',
      section: 'User Management',
      keywords: ['members', 'customers', 'user', 'roles'],
    },
    { label: 'Roles', to: '/rbac/roles', section: 'User Management', keywords: ['rbac', 'permissions', 'access'] },
    { label: 'Categories', to: '/categories', section: 'Catalog' },
    { label: 'Locations', to: '/locations', section: 'Catalog' },
    { label: 'Sliders', to: '/sliders', section: 'Catalog', keywords: ['carousel', 'banner', 'promo'] },
    { label: 'All Clubs', to: '/clubs', section: 'Clubs' },
    { label: 'Pods', to: '/pods', section: 'Clubs', keywords: ['events'] },
    { label: 'Pod Ideas', to: '/pod-ideas', section: 'Clubs' },
    { label: 'Pod Plans', to: '/pod-plans', section: 'Clubs' },
    { label: 'Coupons', to: '/coupons', section: 'Clubs', keywords: ['discount', 'promo'] },
    { label: 'Referrals', to: '/referrals', section: 'Clubs' },
    { label: 'Event Tickets', to: '/event-tickets', section: 'Clubs', keywords: ['qr'] },
    { label: 'FAQs', to: '/faqs', section: 'Engagement' },
    { label: 'Badges', to: '/badges', section: 'Engagement' },
    { label: 'Partner FAQs', to: '/partners/faqs', section: 'Partners' },
    { label: 'Approvals', to: '/approvals', section: 'Approvals', keywords: ['approve', 'deny', 'requests'] },
    { label: 'Branding', to: '/branding', section: 'System', keywords: ['logo', 'theme', 'identity'] },
    { label: 'Settings', to: '/settings', section: 'System', keywords: ['system', 'config', 'preferences'] },
  ],
};
