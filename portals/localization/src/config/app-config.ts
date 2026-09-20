import { parseEnvRoles, type AppConfig } from '@duncit/shell';

/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). `requiredRoles` is overridable
 * via `VITE_REQUIRED_ROLES` so access control stays dynamic.
 */
export const appConfig = {
  key: 'localization',
  name: 'Localization',
  fullName: 'Duncit Localization',
  tagline: 'Every language and every string Duncit ships, in one place.',
  taglineKey: 'shell.portal.localization.tagline',
  promoTitle: 'Every language, one console',
  promoTitleKey: 'shell.portal.localization.promoTitle',
  promoText: 'Add a language, then let AI keep it in sync with English while you work on.',
  promoTextKey: 'shell.portal.localization.promoText',
  portalLabel: 'Localization Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/267669/pexels-photo-267669.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['LOCALIZATION_MANAGER']),
  tokenKey: 'localization_token',
  colorModeKey: 'localization_color_mode',
  accent: { light: '#c7d2fe', main: '#4f46e5', hover: '#4338ca', active: '#3730a3' },
  nav: [
    { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/', icon: 'dashboard' },
    { label: 'Locales', labelKey: 'shell.nav.locales', to: '/locales', icon: 'language' },
    { label: 'Translations', labelKey: 'shell.nav.translations', to: '/translations', icon: 'spellcheck' },
  ],
  modules: [],
} satisfies AppConfig;
