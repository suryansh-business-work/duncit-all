import { parseEnvRoles, SUPER_ROLE, type AppConfig } from '@duncit/shell';

/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). `requiredRoles` is overridable
 * via `VITE_REQUIRED_ROLES` so access control stays dynamic; SUPER_ADMIN
 * always passes.
 */
export const appConfig = {
  key: 'mcp',
  name: 'MCP',
  fullName: 'Duncit MCP',
  tagline: 'Connect Claude, ChatGPT or Gemini to Duncit and see every tool call.',
  taglineKey: 'shell.portal.mcp.tagline',
  promoTitle: 'Your AI, working in Duncit',
  promoTitleKey: 'shell.portal.mcp.promoTitle',
  promoText: 'Approve an AI app once, then see every tool it calls: who, why, what it cost and how it went.',
  promoTextKey: 'shell.portal.mcp.promoText',
  portalLabel: 'MCP Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['MCP_MANAGER', 'MCP_USER']),
  tokenKey: 'mcp_token',
  colorModeKey: 'mcp_color_mode',
  accent: { light: '#f9a8d4', main: '#db2777', hover: '#be185d', active: '#9d174d' },
  nav: [
    { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/', icon: 'dashboard' },
    { label: 'Activity', labelKey: 'shell.nav.mcpActivity', to: '/activity', icon: 'timeline' },
    { label: 'Tools', labelKey: 'shell.nav.tools', to: '/tools', icon: 'tools' },
    { label: 'Connect', labelKey: 'shell.nav.mcpConnect', to: '/connect', icon: 'link' },
    { label: 'Connections', labelKey: 'shell.nav.mcpConnections', to: '/connections', icon: 'hub' },
    { label: 'Settings', labelKey: 'shell.nav.settings', to: '/settings', icon: 'settings' },
    { label: 'Guide', labelKey: 'shell.nav.mcpGuide', to: '/guide', icon: 'menuBook' },
  ],
  modules: [],
} satisfies AppConfig;

/** The managers-only page, which non-managers do not see in the sidebar. */
export const SETTINGS_PATH = '/settings';

/**
 * Who sees everyone's activity and the Settings page. Mirrors the server's
 * MCP_MANAGER_ROLES, which is what actually decides — this only shapes the UI.
 */
export const managerRoles: readonly string[] = [
  SUPER_ROLE,
  ...parseEnvRoles(import.meta.env.VITE_MANAGER_ROLES, ['MCP_MANAGER']),
];
