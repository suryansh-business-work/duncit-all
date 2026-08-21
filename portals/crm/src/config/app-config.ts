import { parseEnvRoles, type AppConfig } from '@duncit/shell';

/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). Reusable configuration only.
 * `requiredRoles` is overridable via `VITE_REQUIRED_ROLES`.
 */
export const appConfig = {
  key: 'crm',
  name: 'CRM',
  fullName: 'Duncit CRM',
  tagline: 'Capture, qualify and convert venue and host leads.',
  taglineKey: 'shell.portal.crm.tagline',
  promoTitle: "Know every customer",
  promoTitleKey: 'shell.portal.crm.promoTitle',
  promoText: "Leads, contacts and conversations — unified. Sign in to dive in.",
  promoTextKey: 'shell.portal.crm.promoText',
  portalLabel: 'CRM Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/7658434/pexels-photo-7658434.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['CRM_MANAGER']),
  tokenKey: 'crm_token',
  colorModeKey: 'crm_color_mode',
  accent: { light: '#a5b4fc', main: '#6366f1', hover: '#4f46e5', active: '#4338ca' },
  nav: [
    { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/', icon: 'dashboard' },
    {
      label: 'Leads', labelKey: 'shell.nav.leads',
      icon: 'groups',
      children: [
        { label: 'Venue Leads', labelKey: 'shell.nav.venueLeads', to: '/venue-leads', icon: 'location' },
        { label: 'Host Leads', labelKey: 'shell.nav.hostLeads', to: '/host-leads', icon: 'groups' },
        { label: 'Ecomm Leads', labelKey: 'shell.nav.ecommLeads', to: '/ecomm-leads', icon: 'inventory' },
        {
          label: 'User Leads', labelKey: 'shell.nav.userLeads',
          icon: 'user-search',
          children: [{ label: 'WhatsApp Leads', labelKey: 'shell.nav.whatsappLeads', to: '/user-leads', icon: 'whatsapp' }],
        },
      ],
    },
    {
      label: 'Tools', labelKey: 'shell.nav.tools',
      icon: 'tools',
      children: [
        { label: 'WhatsApp Lead Generator', labelKey: 'shell.nav.whatsappLeadGenerator', to: '/tools/whatsapp', icon: 'whatsapp' },
      ],
    },
    { label: 'Reminders', labelKey: 'shell.nav.reminders', to: '/reminders', icon: 'calendar' },
    {
      label: 'Data', labelKey: 'shell.nav.data',
      icon: 'analytics',
      children: [
        { label: 'Services Offered', labelKey: 'shell.nav.servicesOffered', to: '/data/services-offered', icon: 'contacts' },
        {
          label: 'Venues', labelKey: 'shell.nav.venues',
          icon: 'location',
          children: [
            { label: 'Amenities management', labelKey: 'shell.nav.amenitiesManagement', to: '/data/venues/amenities', icon: 'analytics' },
            { label: 'Event Suitability management', labelKey: 'shell.nav.eventSuitabilityManagement', to: '/data/venues/event-suitability', icon: 'analytics' },
          ],
        },
      ],
    },
    {
      label: 'Email Templates', labelKey: 'shell.nav.emailTemplates',
      icon: 'email',
      children: [
        { label: 'Templates', labelKey: 'shell.nav.templates', to: '/email-templates', icon: 'email' },
      ],
    },
    {
      label: 'AI Call Prompts', labelKey: 'shell.nav.aiCallPrompts',
      icon: 'ai',
      children: [
        { label: 'Static Content', labelKey: 'shell.nav.staticContent', to: '/call-prompts', icon: 'phone' },
      ],
    },
    {
      label: 'Settings', labelKey: 'shell.nav.settings',
      icon: 'analytics',
      children: [
        { label: 'Dynamic Fields', labelKey: 'shell.nav.dynamicFields', to: '/settings/dynamic-fields', icon: 'analytics' },
      ],
    },
  ],
  modules: [],
} satisfies AppConfig;
