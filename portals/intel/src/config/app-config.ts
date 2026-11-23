import { parseEnvRoles, type AppConfig } from '@duncit/shell';

/**
 * Duncit Intel (intel.duncit.com) — the internal business-intelligence console.
 * Single source of truth for the shared shell: login gating (the same portal
 * login every console uses), light/dark mode, accent and navigation.
 * `requiredRoles` is overridable via `VITE_REQUIRED_ROLES`; SUPER_ADMIN always passes.
 *
 * No `accent` is set: the shell then uses the Duncit CTA red from the design tokens.
 *
 * Chat comes first. Sync and Settings are admin pages; IntelAppShell drops them
 * from the menu for employees (the server refuses them anyway).
 */
export const ADMIN_ONLY_PATHS = new Set(['/sync', '/setting']);

export const appConfig = {
  key: 'intel',
  name: 'Intel',
  fullName: 'Duncit Intel',
  tagline: 'Internal Business Intelligence — your company’s knowledge, connected in one place.',
  taglineKey: 'shell.portal.intel.tagline',
  promoTitle: 'Ask anything about Duncit',
  promoTitleKey: 'shell.portal.intel.promoTitle',
  promoText: 'Search files, code, Slack, Gmail and live data with cited answers — and every production change approved first.',
  promoTextKey: 'shell.portal.intel.promoText',
  portalLabel: 'Duncit Intel',
  loginImage: import.meta.env.VITE_LOGIN_IMAGE || 'https://images.pexels.com/photos/8386434/pexels-photo-8386434.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['INTEL_MANAGER', 'INTEL_USER']),
  tokenKey: 'intel_token',
  colorModeKey: 'intel_color_mode',
  nav: [
    { label: 'New Chat', labelKey: 'shell.nav.newChat', to: '/', icon: 'chat' },
    {
      label: 'Chats', labelKey: 'shell.nav.chats',
      icon: 'forum',
      children: [
        { label: 'Recent', labelKey: 'intel.chats.views.RECENT', to: '/chats/recent', icon: 'timeline' },
        { label: 'Pinned', labelKey: 'intel.chats.views.PINNED', to: '/chats/pinned', icon: 'flag' },
        { label: 'Archived', labelKey: 'intel.chats.views.ARCHIVED', to: '/chats/archived', icon: 'inventory' },
        { label: 'All Chats', labelKey: 'intel.chats.views.ALL', to: '/chats/all', icon: 'article' },
      ],
    },
    { label: 'Media Manager', labelKey: 'shell.nav.mediaManager', to: '/media', icon: 'image' },
    { label: 'Knowledge & Indexes', labelKey: 'shell.nav.knowledgeIndexes', to: '/knowledge', icon: 'storage' },
    { label: 'Sync Dashboard', labelKey: 'shell.nav.syncDashboard', to: '/sync', icon: 'operations' },
    { label: 'Approvals', labelKey: 'shell.nav.approvals', to: '/approvals', icon: 'rule' },
    { label: 'Settings', labelKey: 'shell.nav.settings', to: '/setting', icon: 'settings', pinBottom: true },
  ],
  modules: [],
} satisfies AppConfig;
