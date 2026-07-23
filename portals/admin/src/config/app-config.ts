/**
 * Per-app configuration for the Duncit Admin console. Single source of truth
 * that drives the shared `@duncit/shell` chrome (header/sidebar/search), login
 * gating and theme. Reusable configuration only — no dynamic business data.
 * The `key` is the stable portal identifier sent as `portal_key` on login.
 *
 * `requiredRoles` can be overridden at build/runtime via `VITE_REQUIRED_ROLES`
 * (comma separated) so access control stays dynamic without a code change.
 */
import { parseEnvRoles, type AppConfig } from '@duncit/shell';

export const appConfig = {
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
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, [
    'SUPER_ADMIN',
    'CITY_ADMIN',
    'ZONAL_ADMIN',
    'SUPPORT_USER',
    'FINANCE_USER',
  ]),
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
    { label: 'Clubs', to: '/clubs', icon: 'community' },
    { label: 'Venues', to: '/venues', icon: 'storefront' },
    { label: 'Partners', to: '/partners', icon: 'handshake' },
    {
      label: 'Pods',
      icon: 'calendar',
      children: [
        { label: 'All Pods', to: '/pods', icon: 'calendar' },
        { label: 'Pod Ideas', to: '/pod-ideas', icon: 'insights' },
        { label: 'Pod Plans', to: '/pod-plans', icon: 'description' },
        { label: 'Event Tickets', to: '/event-tickets', icon: 'ticket' },
        { label: 'Pod Settings', to: '/pod-settings', icon: 'tune' },
        { label: 'Pod Monitoring (AI)', to: '/pod-monitoring', icon: 'insights' },
      ],
    },
    {
      label: 'Marketing',
      icon: 'marketing',
      children: [
        { label: 'Coupons', to: '/coupons', icon: 'percent' },
        { label: 'Referrals', to: '/referrals', icon: 'campaign' },
      ],
    },
    {
      label: 'Catalog',
      icon: 'inventory',
      children: [
        { label: 'Categories', to: '/categories', icon: 'accountTree' },
        { label: 'Locations', to: '/locations', icon: 'location' },
      ],
    },
    {
      label: 'Engagement',
      icon: 'campaign',
      children: [
        { label: 'FAQs', to: '/faqs', icon: 'help' },
        { label: 'Partner FAQs', to: '/partners/faqs', icon: 'help' },
        { label: 'Badges', to: '/badges', icon: 'shield' },
      ],
    },
    { label: 'Approvals', to: '/approvals', icon: 'survey' },
    {
      label: 'Upload Settings',
      icon: 'upload',
      children: [
        { label: 'Portals Upload Setting', to: '/upload-settings/portals', icon: 'tune' },
        { label: 'Mobile App', to: '/upload-settings/mobile', icon: 'tune' },
        { label: 'mWeb Upload Setting', to: '/upload-settings/mweb', icon: 'tune' },
      ],
    },
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
    { label: 'Clubs', to: '/clubs', section: 'Clubs', keywords: ['community', 'communities'] },
    { label: 'Venues', to: '/venues', section: 'Venues', keywords: ['spaces', 'places', 'turf'] },
    { label: 'Partners', to: '/partners', section: 'Partners', keywords: ['host', 'venue partner', 'seller', 'club admin'] },
    { label: 'All Pods', to: '/pods', section: 'Pods', keywords: ['events', 'sessions'] },
    { label: 'Pod Ideas', to: '/pod-ideas', section: 'Pods' },
    { label: 'Pod Plans', to: '/pod-plans', section: 'Pods' },
    { label: 'Event Tickets', to: '/event-tickets', section: 'Pods', keywords: ['qr', 'check-in'] },
    { label: 'Pod Settings', to: '/pod-settings', section: 'Pods', keywords: ['draft', 'retention', 'config'] },
    { label: 'Pod Monitoring (AI)', to: '/pod-monitoring', section: 'Pods', keywords: ['audit', 'ai', 'activity', 'risk', 'log'] },
    { label: 'Coupons', to: '/coupons', section: 'Marketing', keywords: ['discount', 'promo'] },
    { label: 'Referrals', to: '/referrals', section: 'Marketing', keywords: ['invite', 'growth'] },
    { label: 'Categories', to: '/categories', section: 'Catalog' },
    { label: 'Locations', to: '/locations', section: 'Catalog' },
    { label: 'FAQs', to: '/faqs', section: 'Engagement' },
    { label: 'Partner FAQs', to: '/partners/faqs', section: 'Engagement', keywords: ['partner', 'help'] },
    { label: 'Badges', to: '/badges', section: 'Engagement', keywords: ['achievement', 'reward'] },
    { label: 'Approvals', to: '/approvals', section: 'Approvals', keywords: ['approve', 'deny', 'requests'] },
    {
      label: 'Portals Upload Setting',
      to: '/upload-settings/portals',
      section: 'Upload Settings',
      keywords: ['upload', 'crop', 'compression', 'image', 'video', 'formats', 'ai'],
    },
    {
      label: 'Mobile App',
      to: '/upload-settings/mobile',
      section: 'Upload Settings',
      keywords: ['upload', 'crop', 'compression', 'reel', 'status', 'mobile', 'native', 'app'],
    },
    {
      label: 'mWeb Upload Setting',
      to: '/upload-settings/mweb',
      section: 'Upload Settings',
      keywords: ['upload', 'crop', 'compression', 'reel', 'status', 'mweb', 'pwa'],
    },
    { label: 'Branding', to: '/branding', section: 'System', keywords: ['logo', 'theme', 'identity'] },
    { label: 'Settings', to: '/settings', section: 'System', keywords: ['system', 'config', 'preferences'] },
  ],
} satisfies AppConfig;
