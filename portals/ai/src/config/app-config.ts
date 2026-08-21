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
  taglineKey: 'shell.portal.ai.tagline',
  promoTitle: "Intelligence on tap",
  promoTitleKey: 'shell.portal.ai.promoTitle',
  promoText: "Models, prompts and AI tooling in one workspace.",
  promoTextKey: 'shell.portal.ai.promoText',
  portalLabel: 'AI Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/5473956/pexels-photo-5473956.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['AI_MANAGER']),
  tokenKey: 'ai_token',
  colorModeKey: 'ai_color_mode',
  accent: { light: '#d8b4fe', main: '#9333ea', hover: '#7e22ce', active: '#6b21a8' },
  nav: [
    { label: 'Welcome', labelKey: 'shell.nav.welcome', to: '/', icon: 'dashboard' },
    { label: 'AI Library', labelKey: 'shell.nav.aiLibrary', to: '/library', icon: 'library' },
    {
      label: 'OpenAI', labelKey: 'shell.nav.openai',
      icon: 'ai',
      children: [
        { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/openai', icon: 'analytics' },
        { label: 'Logs', labelKey: 'shell.nav.logs', to: '/openai/logs', icon: 'article' },
      ],
    },
    {
      label: 'AI Monitoring', labelKey: 'shell.nav.aiMonitoring',
      icon: 'shield',
      children: [
        { label: 'Logs', labelKey: 'shell.nav.logs', to: '/monitoring', icon: 'image' },
        { label: 'Settings', labelKey: 'shell.nav.settings', to: '/monitoring/settings', icon: 'settings' },
      ],
    },
  ],
  modules: [
    {
      title: 'AI Library',
      description:
        'Code prompts every AI feature reads at call time, plus your own AI prompts served by the public GET API.',
      icon: 'library',
    },
    {
      title: 'OpenAI',
      description: 'Every OpenAI call across the platform, with its tokens and cost.',
      icon: 'ai',
    },
    {
      title: 'AI Monitoring',
      description: 'Every uploaded image the platform screened, and the prompt it screened it with.',
      icon: 'shield',
    },
  ],
} satisfies AppConfig;
