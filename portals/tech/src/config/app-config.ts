import { parseEnvRoles, type AppConfig } from '@duncit/shell';

/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). Reusable configuration only —
 * no dynamic business data. `requiredRoles` is overridable via
 * `VITE_REQUIRED_ROLES` so access control stays dynamic.
 */
export const appConfig = {
  key: 'tech',
  name: 'Tech',
  fullName: 'Duncit Tech',
  tagline: 'Manage platform configuration and environment variables.',
  promoTitle: 'Ship with control',
  promoText: 'Environment, feature flags and platform config in one console.',
  portalLabel: 'Tech Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/6804068/pexels-photo-6804068.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['TECH_MANAGER']),
  tokenKey: 'tech_token',
  colorModeKey: 'tech_color_mode',
  accent: { light: '#94a3b8', main: '#0ea5e9', hover: '#0284c7', active: '#0369a1' },
  nav: [
    { label: 'Environment Variables', to: '/', icon: 'settings' },
    { label: 'Maintenance', to: '/portal-modes', icon: 'construction' },
    { label: 'Feature Flags', to: '/feature-flags', icon: 'flag' },
    { label: 'Authentication', to: '/authentication', icon: 'lock' },
    { label: 'Email Templates', to: '/email-templates', icon: 'email' },
    { label: 'Telemetry Dashboard', to: '/telemetry', icon: 'insights' },
    { label: 'Bugs', to: '/bugs', icon: 'bug' },
    { label: 'Telemetry Logs Settings', to: '/telemetry-logs-settings', icon: 'tune' },
    {
      label: 'Server',
      icon: 'dns',
      children: [
        { label: 'Info', to: '/server/info', icon: 'info' },
        { label: 'Docker', to: '/server/docker', icon: 'docker' },
        { label: 'Terminal', to: '/server/terminal', icon: 'terminal' },
      ],
    },
    { label: 'Slack', to: '/slack', icon: 'chat' },
  ],
  modules: [],
} satisfies AppConfig;
