import { parseEnvRoles, type AppConfig } from '@duncit/shell';

/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). `requiredRoles` is overridable
 * via `VITE_REQUIRED_ROLES` so access control stays dynamic.
 */
export const appConfig = {
  key: 'ai',
  name: 'AI',
  fullName: 'Duncit AI',
  tagline: 'Operate AI tools and model configuration.',
  promoTitle: "Intelligence on tap",
  promoText: "Models, prompts and AI tooling in one workspace.",
  portalLabel: 'AI Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/5473956/pexels-photo-5473956.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['AI_MANAGER']),
  tokenKey: 'ai_token',
  colorModeKey: 'ai_color_mode',
  accent: { light: '#d8b4fe', main: '#9333ea', hover: '#7e22ce', active: '#6b21a8' },
  nav: [
    { label: 'Welcome', to: '/', icon: 'dashboard' },
    { label: 'AI Library', to: '/library', icon: 'library' },
  ],
  modules: [
    {
      title: 'Prompt Library',
      description: 'Curate reusable AI prompts and track their token size.',
      icon: 'library',
    },
  ],
} satisfies AppConfig;
