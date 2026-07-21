/**
 * Per-app configuration for the Duncit Onboarding console. Reusable configuration only —
 * no dynamic business data. `requiredRoles` is overridable via `VITE_REQUIRED_ROLES`.
 */
import { parseEnvRoles, type AppConfig } from '@duncit/shell';

export const appConfig = {
  key: 'onboarding',
  name: 'Onboarding',
  fullName: 'Duncit Onboarding',
  tagline: 'Manage onboarding journeys, verification and approvals.',
  promoTitle: 'Onboard with ease',
  promoText: 'Welcome, verify and activate new members and partners.',
  portalLabel: 'Onboarding Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/7857197/pexels-photo-7857197.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['ONBOARDING_MANAGER']),
  tokenKey: 'onboarding_token',
  colorModeKey: 'onboarding_color_mode',
  accent: { light: '#a5b4fc', main: '#6366f1', hover: '#4f46e5', active: '#4338ca' },
  nav: [
    { label: 'Dashboard', to: '/', icon: 'dashboard' },
    { label: 'Surveys', to: '/surveys', icon: 'survey' },
    {
      label: 'Meeting Schedule',
      icon: 'calendar',
      children: [
        { label: 'Calendar', to: '/meetings/calendar', icon: 'calendar' },
        { label: 'Venue Meetings', to: '/meetings/venue', icon: 'storefront' },
        { label: 'Host Meetings', to: '/meetings/host', icon: 'people' },
        { label: 'E-Commerce Brand Meetings', to: '/meetings/ecomm', icon: 'inventory' },
        { label: 'Club Admin Meetings', to: '/meetings/club_admin', icon: 'groups' },
        { label: 'Meeting Availability', to: '/meetings/availability', icon: 'settings' },
      ],
    },
    {
      label: 'Onboarding',
      icon: 'people',
      children: [
        { label: 'Host Additional Requests', to: '/host-requests', icon: 'host-request' },
        { label: 'Onboarded Hosts', to: '/hosts', icon: 'people' },
        { label: 'Onboarded Venues', to: '/venues', icon: 'storefront' },
        { label: 'Onboarded E-Commerce Brands', to: '/ecomm-brands', icon: 'inventory' },
        { label: 'Onboarded Club Admins', to: '/club-admins', icon: 'groups' },
      ],
    },
  ],
  modules: [],
} satisfies AppConfig;
