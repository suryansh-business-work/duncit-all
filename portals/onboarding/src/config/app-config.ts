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
    { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/', icon: 'dashboard' },
    { label: 'Surveys', labelKey: 'shell.nav.surveys', to: '/surveys', icon: 'survey' },
    {
      label: 'Meeting Schedule', labelKey: 'shell.nav.meetingSchedule',
      icon: 'calendar',
      children: [
        { label: 'Calendar', labelKey: 'shell.nav.calendar', to: '/meetings/calendar', icon: 'calendar' },
        { label: 'Venue Meetings', labelKey: 'shell.nav.venueMeetings', to: '/meetings/venue', icon: 'storefront' },
        { label: 'Host Meetings', labelKey: 'shell.nav.hostMeetings', to: '/meetings/host', icon: 'people' },
        { label: 'E-Commerce Brand Meetings', labelKey: 'shell.nav.eCommerceBrandMeetings', to: '/meetings/ecomm', icon: 'inventory' },
        { label: 'Club Admin Meetings', labelKey: 'shell.nav.clubAdminMeetings', to: '/meetings/club_admin', icon: 'groups' },
        { label: 'Meeting Availability', labelKey: 'shell.nav.meetingAvailability', to: '/meetings/availability', icon: 'settings' },
      ],
    },
    {
      label: 'Onboarding', labelKey: 'shell.nav.onboarding',
      icon: 'people',
      children: [
        { label: 'Host Additional Requests', labelKey: 'shell.nav.hostAdditionalRequests', to: '/host-requests', icon: 'host-request' },
        { label: 'Onboarded Hosts', labelKey: 'shell.nav.onboardedHosts', to: '/hosts', icon: 'people' },
        { label: 'Onboarded Venues', labelKey: 'shell.nav.onboardedVenues', to: '/venues', icon: 'storefront' },
        { label: 'Onboarded E-Commerce Brands', labelKey: 'shell.nav.onboardedECommerceBrands', to: '/ecomm-brands', icon: 'inventory' },
        { label: 'Onboarded Club Admins', labelKey: 'shell.nav.onboardedClubAdmins', to: '/club-admins', icon: 'groups' },
      ],
    },
  ],
  modules: [],
} satisfies AppConfig;
