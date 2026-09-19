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
  taglineKey: 'shell.portal.marketing.tagline',
  promoTitle: "Reach, amplified",
  promoTitleKey: 'shell.portal.marketing.promoTitle',
  promoText: "Campaigns, notifications and audiences — one place.",
  promoTextKey: 'shell.portal.marketing.promoText',
  portalLabel: 'Marketing Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/7693745/pexels-photo-7693745.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['MARKETING_MANAGER']),
  tokenKey: 'marketing_token',
  colorModeKey: 'marketing_color_mode',
  accent: { light: '#fda4af', main: '#e11d48', hover: '#be123c', active: '#9f1239' },
  nav: [
    { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/', icon: 'dashboard' },
    { label: 'Target Audience', labelKey: 'shell.nav.targetAudience', to: '/audience', icon: 'personSearch' },
    {
      // Everything you send lives here: email and push are two ways of
      // reaching the same audience, not two separate parts of the console.
      label: 'Campaigns', labelKey: 'shell.nav.campaigns',
      icon: 'contactMail',
      children: [
        { label: 'Email', labelKey: 'shell.nav.email', to: '/campaigns/email', icon: 'email' },
        { label: 'Notifications', labelKey: 'shell.nav.notifications', to: '/notifications', icon: 'notifications' },
        { label: 'App Popups', labelKey: 'shell.nav.appPopups', to: '/app-popups', icon: 'image' },
        // Under Campaigns, not under a reporting section: an opt-out is what a
        // campaign costs, and the number is only useful next to the send that
        // caused it.
        { label: 'Mail Preferences', labelKey: 'shell.nav.mailPreferences', to: '/campaigns/mail-preferences', icon: 'markEmailRead' },
      ],
    },
    // Beside Campaigns rather than inside it: a status is published, not sent —
    // it sits at the front of the apps' status rail until it expires or is
    // switched off, so nothing about it is a dispatch.
    { label: 'Status', labelKey: 'shell.nav.status', to: '/status', icon: 'newspaper' },
    // Its own section, not a child of Campaigns: a short link is just as often
    // made for an ad, a poster or a partner as for a campaign.
    { label: 'Short Links', labelKey: 'shell.nav.shortLinks', to: '/short-links', icon: 'link' },
    // Beside Short Links rather than inside it: a link to somebody else's page
    // is a different thing to approve and a different thing to keep data
    // about, even though it is the same duncit.com/<code> underneath.
    { label: 'External Links', labelKey: 'shell.nav.externalLinks', to: '/external-links', icon: 'language' },
    // Its own section: the accounts are connected once and then watched —
    // how posts perform and what people say under them — not sent to.
    { label: 'Social Accounts', labelKey: 'shell.nav.socialAccounts', to: '/social-accounts', icon: 'hub' },
    // A discount code is a promotion, so it belongs to whoever runs promotions.
    // It sits beside Campaigns rather than inside one: a code is as likely to be
    // handed out at an event or printed on a poster as it is to be emailed.
    { label: 'Coupons', labelKey: 'shell.nav.coupons', to: '/coupons', icon: 'percent' },
    {
      label: 'Ads', labelKey: 'shell.nav.ads',
      icon: 'campaign',
      children: [
        { label: 'Ads Approval', labelKey: 'shell.nav.adsApproval', to: '/ads-approvals', icon: 'campaign' },
        { label: 'Live Ads', labelKey: 'shell.nav.liveAds', to: '/live-ads', icon: 'insights' },
        { label: 'Ads Settings', labelKey: 'shell.nav.adsSettings', to: '/ads-settings', icon: 'settings' },
      ],
    },
  ],
  modules: [],
} satisfies AppConfig;
