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
    { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/', icon: 'dashboard' },
    {
      label: 'AI Library', labelKey: 'shell.nav.aiLibrary',
      icon: 'library',
      children: [
        { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/library/dashboard', icon: 'analytics' },
        { label: 'Library', labelKey: 'shell.nav.library', to: '/library', icon: 'library' },
      ],
    },
    {
      label: 'AI Features', labelKey: 'shell.nav.aiFeatures',
      icon: 'tune',
      children: [
        { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/ai-features/dashboard', icon: 'analytics' },
        { label: 'Features', labelKey: 'shell.nav.features', to: '/ai-features', icon: 'tune' },
      ],
    },
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
    {
      label: 'Ask Duncit', labelKey: 'shell.nav.askDuncit',
      icon: 'forum',
      children: [
        { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/ask-duncit', icon: 'analytics' },
        { label: 'Live Conversations', labelKey: 'shell.nav.liveConversations', to: '/ask-duncit/live', icon: 'chat' },
        { label: 'Chat History & Logs', labelKey: 'shell.nav.chatLogs', to: '/ask-duncit/logs', icon: 'article' },
        { label: 'Out-of-Context Queries', labelKey: 'shell.nav.outOfContext', to: '/ask-duncit/out-of-context', icon: 'help' },
        { label: 'Security & Access Violations', labelKey: 'shell.nav.securityViolations', to: '/ask-duncit/violations', icon: 'shield' },
        { label: 'MCP & Tool Management', labelKey: 'shell.nav.mcpTools', to: '/ask-duncit/tools', icon: 'tools' },
        { label: 'Knowledge Base', labelKey: 'shell.nav.knowledgeBase', to: '/ask-duncit/knowledge', icon: 'menuBook' },
        { label: 'Model & LLM Settings', labelKey: 'shell.nav.modelSettings', to: '/ask-duncit/models', icon: 'ai' },
        { label: 'Prompt Management', labelKey: 'shell.nav.promptManagement', to: '/ask-duncit/prompts', icon: 'quote' },
        { label: 'Feedback & Evaluation', labelKey: 'shell.nav.feedbackEvaluation', to: '/ask-duncit/feedback', icon: 'feedback' },
        { label: 'Cost & Usage Analytics', labelKey: 'shell.nav.costUsage', to: '/ask-duncit/cost', icon: 'payments' },
        { label: 'Feature Flags', labelKey: 'shell.nav.featureFlags', to: '/ask-duncit/flags', icon: 'flag' },
        { label: 'AI Agent Control Center', labelKey: 'shell.nav.agentControlCenter', to: '/ask-duncit/control-center', icon: 'tune' },
      ],
    },
    {
      label: 'Automation', labelKey: 'shell.nav.automation',
      icon: 'hub',
      children: [
        { label: 'WhatsApp', labelKey: 'shell.nav.whatsapp', to: '/automation/whatsapp', icon: 'whatsapp' },
        { label: 'Email', labelKey: 'shell.nav.email', to: '/automation/email', icon: 'email' },
      ],
    },
  ],
} satisfies AppConfig;
