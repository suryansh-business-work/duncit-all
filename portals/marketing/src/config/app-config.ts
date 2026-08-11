/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). `requiredRoles` is overridable
 * via `VITE_REQUIRED_ROLES` so access control stays dynamic.
 */
import { parseEnvRoles, type AppConfig } from '@duncit/shell';

export const appConfig = {
  key: 'marketing',
  name: 'Marketing',
  fullName: 'Duncit Marketing',
  tagline: 'Plan campaigns and brand content.',
  promoTitle: "Reach, amplified",
  promoText: "Campaigns, notifications and audiences — one place.",
  portalLabel: 'Marketing Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/7693745/pexels-photo-7693745.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['MARKETING_MANAGER']),
  tokenKey: 'marketing_token',
  colorModeKey: 'marketing_color_mode',
  accent: { light: '#fda4af', main: '#e11d48', hover: '#be123c', active: '#9f1239' },
  nav: [
    { label: 'Dashboard', to: '/', icon: 'dashboard' },
    { label: 'Target Audience', to: '/audience', icon: 'personSearch' },
    {
      // Everything you send lives here: email and push are two ways of
      // reaching the same audience, not two separate parts of the console.
      label: 'Campaigns',
      icon: 'contactMail',
      children: [
        { label: 'Email', to: '/campaigns/email', icon: 'email' },
        { label: 'WhatsApp', to: '/campaigns/whatsapp', icon: 'whatsapp' },
        { label: 'Notifications', to: '/notifications', icon: 'notifications' },
        { label: 'App Popups', to: '/app-popups', icon: 'image' },
        // Under Campaigns, not under a reporting section: an opt-out is what a
        // campaign costs, and the number is only useful next to the send that
        // caused it.
        { label: 'Mail Preferences', to: '/campaigns/mail-preferences', icon: 'markEmailRead' },
      ],
    },
    // Its own section, not a child of Campaigns: a short link is just as often
    // made for an ad, a poster or a partner as for a campaign.
    { label: 'Short Links', to: '/short-links', icon: 'link' },
    {
      label: 'Ads',
      icon: 'campaign',
      children: [
        { label: 'Ads Approval', to: '/ads-approvals', icon: 'campaign' },
        { label: 'Live Ads', to: '/live-ads', icon: 'insights' },
        { label: 'Ads Settings', to: '/ads-settings', icon: 'settings' },
      ],
    },
  ],
  modules: [],
} satisfies AppConfig;
