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
  taglineKey: 'shell.portal.admin.tagline',
  promoTitle: 'One unified portal',
  promoTitleKey: 'shell.portal.admin.promoTitle',
  promoText: 'Every team, every metric — one place. Sign in and get moving.',
  promoTextKey: 'shell.portal.admin.promoText',
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
    { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/dashboard', section: 'Dashboard', sectionKey: 'shell.nav.dashboard' },
    {
      label: 'All Users', labelKey: 'shell.nav.allUsers',
      to: '/users',
      section: 'User Management', sectionKey: 'shell.nav.userManagement',
      keywords: ['members', 'customers', 'user', 'roles'],
    },
    { label: 'Roles', labelKey: 'shell.nav.roles', to: '/rbac/roles', section: 'User Management', sectionKey: 'shell.nav.userManagement', keywords: ['rbac', 'permissions', 'access'] },
    { label: 'Clubs', labelKey: 'shell.nav.clubs', to: '/clubs', section: 'Clubs', sectionKey: 'shell.nav.clubs', keywords: ['community', 'communities'] },
    { label: 'Venues', labelKey: 'shell.nav.venues', to: '/venues', section: 'Venues', sectionKey: 'shell.nav.venues', keywords: ['spaces', 'places', 'turf'] },
    { label: 'Partners', labelKey: 'shell.nav.partners', to: '/partners', section: 'Partners', sectionKey: 'shell.nav.partners', keywords: ['host', 'venue partner', 'seller', 'club admin'] },
    {
      label: 'Pods Dashboard', labelKey: 'shell.nav.podsDashboard',
      to: '/pods/dashboard',
      section: 'Pods', sectionKey: 'shell.nav.pods',
      keywords: ['stats', 'overview', 'ratings', 'occupancy', 'revenue'],
    },
    { label: 'All Pods', labelKey: 'shell.nav.allPods', to: '/pods', section: 'Pods', sectionKey: 'shell.nav.pods', keywords: ['events', 'sessions'] },
    {
      label: 'Auto Pods', labelKey: 'shell.nav.autoPods',
      to: AUTO_PODS_PATH,
      section: 'Pods', sectionKey: 'shell.nav.pods',
      keywords: ['auto', 'enrol', 'enroll', 'marketplace', 'venue', 'host', 'club admin', 'offer'],
    },
    { label: 'Pod Ideas', labelKey: 'shell.nav.podIdeas', to: '/pod-ideas', section: 'Pods', sectionKey: 'shell.nav.pods' },
    { label: 'Pod Plans', labelKey: 'shell.nav.podPlans', to: '/pod-plans', section: 'Pods', sectionKey: 'shell.nav.pods' },
    { label: 'Event Tickets', labelKey: 'shell.nav.eventTickets', to: '/event-tickets', section: 'Pods', sectionKey: 'shell.nav.pods', keywords: ['qr', 'check-in'] },
    { label: 'Pod Settings', labelKey: 'shell.nav.podSettings', to: '/pod-settings', section: 'Pods', sectionKey: 'shell.nav.pods', keywords: ['draft', 'retention', 'config'] },
    { label: 'Pod Monitoring (AI)', labelKey: 'shell.nav.podMonitoringAi', to: '/pod-monitoring', section: 'Pods', sectionKey: 'shell.nav.pods', keywords: ['audit', 'ai', 'activity', 'risk', 'log'] },
    {
      label: 'Plans', labelKey: 'shell.nav.plans',
      to: '/membership/plans',
      section: 'Membership', sectionKey: 'shell.nav.membership',
      keywords: ['membership', 'tier', 'pricing', 'access', 'connect', 'elite', 'luxe', 'benefit'],
    },
    {
      label: 'Subscribers', labelKey: 'shell.nav.subscribers',
      to: '/membership/subscribers',
      section: 'Membership', sectionKey: 'shell.nav.membership',
      keywords: ['membership', 'notify', 'waitlist', 'news'],
    },
    { label: 'Categories', labelKey: 'shell.nav.categories', to: '/categories', section: 'Catalog', sectionKey: 'shell.nav.catalog' },
    { label: 'Locations', labelKey: 'shell.nav.locations', to: '/locations', section: 'Catalog', sectionKey: 'shell.nav.catalog' },
    { label: 'Badges', labelKey: 'shell.nav.badges', to: '/badges', section: 'Engagement', sectionKey: 'shell.nav.engagement', keywords: ['achievement', 'reward'] },
    { label: 'Something for you', labelKey: 'shell.nav.somethingForYou', to: '/something-for-you', section: 'Engagement', sectionKey: 'shell.nav.engagement', keywords: ['home', 'rail', 'promo', 'cards'] },
    {
      label: 'WhatsApp', labelKey: 'shell.nav.whatsapp',
      to: '/whatsapp',
      section: 'WhatsApp', sectionKey: 'shell.nav.whatsapp',
      keywords: ['whatsapp', 'aisensy', 'automation', 'scenario', 'template', 'campaign', 'message log'],
    },
    { label: 'Approvals', labelKey: 'shell.nav.approvals', to: '/approvals', section: 'Approvals', sectionKey: 'shell.nav.approvals', keywords: ['approve', 'deny', 'requests'] },
    {
      label: 'Portal Access', labelKey: 'shell.nav.portalAccess',
      to: '/portal-access',
      section: 'Approvals', sectionKey: 'shell.nav.approvals',
      keywords: ['portal', 'access', 'request', 'jump', 'console', 'grant', 'role'],
    },
    {
      label: 'Portals Upload Setting', labelKey: 'shell.nav.portalsUploadSetting',
      to: '/upload-settings/portals',
      section: 'Upload Settings', sectionKey: 'shell.nav.uploadSettings',
      keywords: ['upload', 'crop', 'compression', 'image', 'video', 'formats', 'ai'],
    },
    {
      label: 'Mobile App', labelKey: 'shell.nav.mobileApp',
      to: '/upload-settings/mobile',
      section: 'Upload Settings', sectionKey: 'shell.nav.uploadSettings',
      keywords: ['upload', 'crop', 'compression', 'reel', 'status', 'mobile', 'native', 'app'],
    },
    {
      label: 'mWeb Upload Setting', labelKey: 'shell.nav.mwebUploadSetting',
      to: '/upload-settings/mweb',
      section: 'Upload Settings', sectionKey: 'shell.nav.uploadSettings',
      keywords: ['upload', 'crop', 'compression', 'reel', 'status', 'mweb', 'pwa'],
    },
    { label: 'Branding', labelKey: 'shell.nav.branding', to: '/branding', section: 'System', sectionKey: 'shell.nav.system', keywords: ['logo', 'theme', 'identity'] },
    { label: 'Settings', labelKey: 'shell.nav.settings', to: '/settings', section: 'System', sectionKey: 'shell.nav.system', keywords: ['system', 'config', 'preferences'] },
    {
      label: 'Portal App Setting', labelKey: 'shell.nav.portalAppSetting',
      to: '/portal-app-settings',
      section: 'System', sectionKey: 'shell.nav.system',
      keywords: ['portal', 'header', 'chat', 'coworker', 'apps', 'drawer', 'console'],
    },
  ],
} satisfies AppConfig;
