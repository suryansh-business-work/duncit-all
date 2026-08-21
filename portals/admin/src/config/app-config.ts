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

/**
 * Auto Pods ship behind the `auto_pods` feature flag. The nav child and the
 * search entry are filtered out of the chrome by `AppShell` while the flag is
 * off, and the route redirects — one path, named once, so the three cannot
 * disagree.
 */
export const AUTO_PODS_PATH = '/auto-pods';

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
    { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/dashboard', icon: 'dashboard' },
    {
      label: 'User Management', labelKey: 'shell.nav.userManagement',
      icon: 'people',
      children: [
        { label: 'All Users', labelKey: 'shell.nav.allUsers', to: '/users', icon: 'people' },
        { label: 'Roles', labelKey: 'shell.nav.roles', to: '/rbac/roles', icon: 'shield' },
      ],
    },
    { label: 'Clubs', labelKey: 'shell.nav.clubs', to: '/clubs', icon: 'community' },
    { label: 'Venues', labelKey: 'shell.nav.venues', to: '/venues', icon: 'storefront' },
    { label: 'Partners', labelKey: 'shell.nav.partners', to: '/partners', icon: 'handshake' },
    {
      label: 'Pods', labelKey: 'shell.nav.pods',
      icon: 'calendar',
      children: [
        { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/pods/dashboard', icon: 'insights' },
        { label: 'All Pods', labelKey: 'shell.nav.allPods', to: '/pods', icon: 'calendar' },
        { label: 'Auto Pods', labelKey: 'shell.nav.autoPods', to: AUTO_PODS_PATH, icon: 'handshake' },
        { label: 'Pod Ideas', labelKey: 'shell.nav.podIdeas', to: '/pod-ideas', icon: 'insights' },
        { label: 'Pod Plans', labelKey: 'shell.nav.podPlans', to: '/pod-plans', icon: 'description' },
        { label: 'Event Tickets', labelKey: 'shell.nav.eventTickets', to: '/event-tickets', icon: 'ticket' },
        { label: 'Pod Settings', labelKey: 'shell.nav.podSettings', to: '/pod-settings', icon: 'tune' },
        { label: 'Pod Monitoring (AI)', labelKey: 'shell.nav.podMonitoringAi', to: '/pod-monitoring', icon: 'insights' },
      ],
    },
    {
      label: 'Membership', labelKey: 'shell.nav.membership',
      icon: 'ticket',
      children: [
        { label: 'Plans', labelKey: 'shell.nav.plans', to: '/membership/plans', icon: 'description' },
        { label: 'Subscribers', labelKey: 'shell.nav.subscribers', to: '/membership/subscribers', icon: 'people' },
      ],
    },
    {
      label: 'Catalog', labelKey: 'shell.nav.catalog',
      icon: 'inventory',
      children: [
        { label: 'Categories', labelKey: 'shell.nav.categories', to: '/categories', icon: 'accountTree' },
        { label: 'Locations', labelKey: 'shell.nav.locations', to: '/locations', icon: 'location' },
      ],
    },
    {
      label: 'Engagement', labelKey: 'shell.nav.engagement',
      icon: 'campaign',
      children: [
        { label: 'FAQs', labelKey: 'shell.nav.faqs', to: '/faqs', icon: 'help' },
        { label: 'Partner FAQs', labelKey: 'shell.nav.partnerFaqs', to: '/partners/faqs', icon: 'help' },
        { label: 'Badges', labelKey: 'shell.nav.badges', to: '/badges', icon: 'shield' },
        { label: 'Something for you', labelKey: 'shell.nav.somethingForYou', to: '/something-for-you', icon: 'campaign' },
      ],
    },
    { label: 'WhatsApp', labelKey: 'shell.nav.whatsapp', to: '/whatsapp', icon: 'whatsapp' },
    { label: 'Approvals', labelKey: 'shell.nav.approvals', to: '/approvals', icon: 'survey' },
    { label: 'Portal Access', labelKey: 'shell.nav.portalAccess', to: '/portal-access', icon: 'lock' },
    {
      label: 'Upload Settings', labelKey: 'shell.nav.uploadSettings',
      icon: 'upload',
      children: [
        { label: 'Portals Upload Setting', labelKey: 'shell.nav.portalsUploadSetting', to: '/upload-settings/portals', icon: 'tune' },
        { label: 'Mobile App', labelKey: 'shell.nav.mobileApp', to: '/upload-settings/mobile', icon: 'tune' },
        { label: 'mWeb Upload Setting', labelKey: 'shell.nav.mwebUploadSetting', to: '/upload-settings/mweb', icon: 'tune' },
      ],
    },
    {
      label: 'Localization', labelKey: 'shell.nav.localization',
      icon: 'translate',
      children: [
        { label: 'Locales', labelKey: 'shell.nav.locales', to: '/localization/locales', icon: 'language' },
        { label: 'Translations', labelKey: 'shell.nav.translations', to: '/localization/translations', icon: 'spellcheck' },
      ],
    },
    {
      label: 'System', labelKey: 'shell.nav.system',
      icon: 'settings',
      children: [
        { label: 'Branding', labelKey: 'shell.nav.branding', to: '/branding', icon: 'tune' },
        { label: 'Settings', labelKey: 'shell.nav.settings', to: '/settings', icon: 'settings' },
        { label: 'Portal App Setting', labelKey: 'shell.nav.portalAppSetting', to: '/portal-app-settings', icon: 'tune' },
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
    {
      label: 'Pods Dashboard',
      to: '/pods/dashboard',
      section: 'Pods',
      keywords: ['stats', 'overview', 'ratings', 'occupancy', 'revenue'],
    },
    { label: 'All Pods', to: '/pods', section: 'Pods', keywords: ['events', 'sessions'] },
    {
      label: 'Auto Pods',
      to: AUTO_PODS_PATH,
      section: 'Pods',
      keywords: ['auto', 'enrol', 'enroll', 'marketplace', 'venue', 'host', 'club admin', 'offer'],
    },
    { label: 'Pod Ideas', to: '/pod-ideas', section: 'Pods' },
    { label: 'Pod Plans', to: '/pod-plans', section: 'Pods' },
    { label: 'Event Tickets', to: '/event-tickets', section: 'Pods', keywords: ['qr', 'check-in'] },
    { label: 'Pod Settings', to: '/pod-settings', section: 'Pods', keywords: ['draft', 'retention', 'config'] },
    { label: 'Pod Monitoring (AI)', to: '/pod-monitoring', section: 'Pods', keywords: ['audit', 'ai', 'activity', 'risk', 'log'] },
    {
      label: 'Plans',
      to: '/membership/plans',
      section: 'Membership',
      keywords: ['membership', 'tier', 'pricing', 'access', 'connect', 'elite', 'luxe', 'benefit'],
    },
    {
      label: 'Subscribers',
      to: '/membership/subscribers',
      section: 'Membership',
      keywords: ['membership', 'notify', 'waitlist', 'news'],
    },
    { label: 'Categories', to: '/categories', section: 'Catalog' },
    { label: 'Locations', to: '/locations', section: 'Catalog' },
    { label: 'FAQs', to: '/faqs', section: 'Engagement' },
    { label: 'Partner FAQs', to: '/partners/faqs', section: 'Engagement', keywords: ['partner', 'help'] },
    { label: 'Badges', to: '/badges', section: 'Engagement', keywords: ['achievement', 'reward'] },
    { label: 'Something for you', to: '/something-for-you', section: 'Engagement', keywords: ['home', 'rail', 'promo', 'cards'] },
    {
      label: 'WhatsApp',
      to: '/whatsapp',
      section: 'WhatsApp',
      keywords: ['whatsapp', 'aisensy', 'automation', 'scenario', 'template', 'campaign', 'message log'],
    },
    { label: 'Approvals', to: '/approvals', section: 'Approvals', keywords: ['approve', 'deny', 'requests'] },
    {
      label: 'Portal Access',
      to: '/portal-access',
      section: 'Approvals',
      keywords: ['portal', 'access', 'request', 'jump', 'console', 'grant', 'role'],
    },
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
    {
      label: 'Portal App Setting',
      to: '/portal-app-settings',
      section: 'System',
      keywords: ['portal', 'header', 'chat', 'coworker', 'apps', 'drawer', 'console'],
    },
  ],
} satisfies AppConfig;
