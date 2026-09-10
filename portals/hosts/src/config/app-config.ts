import { parseEnvRoles, type AppConfig } from '@duncit/shell';

/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). `requiredRoles` is overridable
 * via `VITE_REQUIRED_ROLES` so access control stays dynamic.
 */
export const appConfig = {
  key: 'hosts',
  name: 'Hosts',
  fullName: 'Duncit Hosts',
  tagline: 'Hosts across all of Duncit.',
  taglineKey: 'shell.portal.hosts.tagline',
  promoTitle: 'Every hosts, one list',
  promoTitleKey: 'shell.portal.hosts.promoTitle',
  promoText: 'One directory for every hosts on Duncit.',
  promoTextKey: 'shell.portal.hosts.promoText',
  portalLabel: 'Hosts Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/1181395/pexels-photo-1181395.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ["ALL_HOSTS_ACCESS","ONBOARDING_MANAGER"]),
  tokenKey: 'hosts_token',
  colorModeKey: 'hosts_color_mode',
  accent: {"light":"#fda4af","main":"#e11d48","hover":"#be123c","active":"#9f1239"},
  nav: [
    { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/', icon: 'dashboard' },
  ],
  modules: [],
} satisfies AppConfig;
