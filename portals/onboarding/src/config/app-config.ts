/**
 * Per-app configuration for the Duncit Onboarding console. Reusable configuration only —
 * no dynamic business data. `requiredRoles` is overridable via `VITE_REQUIRED_ROLES`.
 */
export interface AppNavItem { label: string; to?: string; icon: string; children?: AppNavItem[]; }
export interface AppModule { title: string; description: string; icon: string; }
export interface AccentColors { light: string; main: string; hover: string; active: string; }

export interface AppConfig {
  key: string;
  name: string;
  fullName: string;
  tagline: string;
  promoTitle: string;
  promoText: string;
  portalLabel: string;
  loginImage: string;
  requiredRoles: string[];
  tokenKey: string;
  colorModeKey: string;
  accent: AccentColors;
  nav: AppNavItem[];
  modules: AppModule[];
}

const envRoles = String(import.meta.env.VITE_REQUIRED_ROLES ?? '')
  .split(',')
  .map((role: string) => role.trim())
  .filter(Boolean);

export const appConfig: AppConfig = {
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
  requiredRoles: envRoles.length ? envRoles : ['ONBOARDING_MANAGER'],
  tokenKey: 'onboarding_token',
  colorModeKey: 'onboarding_color_mode',
  accent: { light: '#a5b4fc', main: '#6366f1', hover: '#4f46e5', active: '#4338ca' },
  nav: [
    { label: 'Dashboard', to: '/', icon: 'dashboard' },
    { label: 'Surveys', to: '/surveys', icon: 'survey' },
    {
      label: 'Meeting',
      icon: 'calendar',
      children: [
        { label: 'Calendar', to: '/meetings/calendar', icon: 'calendar' },
        { label: 'Venue Meeting Schedule', to: '/meetings/venue', icon: 'storefront' },
        { label: 'Host Meeting Schedule', to: '/meetings/host', icon: 'people' },
        { label: 'Seller Meeting Schedule', to: '/meetings/ecomm', icon: 'inventory' },
        { label: 'Meeting Availability', to: '/meetings/availability', icon: 'settings' },
      ],
    },
    {
      label: 'Onboarding',
      icon: 'people',
      children: [
        { label: 'Onboarded Hosts', to: '/hosts', icon: 'people' },
        { label: 'Onboarded Venues', to: '/venues', icon: 'storefront' },
        { label: 'Onboarded E-Commerce Brands', to: '/ecomm-brands', icon: 'inventory' },
      ],
    },
  ],
  modules: [],
};
