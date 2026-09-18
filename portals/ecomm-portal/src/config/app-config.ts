import { parseEnvRoles, type AppConfig } from '@duncit/shell';

/**
 * The E-commerce console — runs the Duncit Pet Store (ecomm.duncit.com):
 * what is on the shelf and how it is filed, the home page, orders, returns,
 * customers, coupons and the store's own settings. `requiredRoles` is
 * overridable via `VITE_REQUIRED_ROLES` so access control stays dynamic.
 */
export const appConfig = {
  key: 'ecomm-portal',
  name: 'E-commerce',
  fullName: 'Duncit E-commerce',
  tagline: 'Run the Duncit Pet Store — shelves, orders and customers in one place.',
  taglineKey: 'shell.portal.ecommPortal.tagline',
  promoTitle: 'Everything your pet store needs',
  promoTitleKey: 'shell.portal.ecommPortal.promoTitle',
  promoText: 'List products, build the home page, ship orders and settle returns.',
  promoTextKey: 'shell.portal.ecommPortal.promoText',
  portalLabel: 'E-commerce Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/1350593/pexels-photo-1350593.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['ECOMM_MANAGER']),
  tokenKey: 'ecomm_portal_token',
  colorModeKey: 'ecomm_portal_color_mode',
  accent: { light: '#fdba74', main: '#ea580c', hover: '#c2410c', active: '#9a3412' },
  nav: [
    { label: 'Dashboard', labelKey: 'ecommPortal.nav.dashboard', to: '/', icon: 'dashboard' },
    { label: 'Orders', labelKey: 'ecommPortal.nav.orders', to: '/orders', icon: 'orders' },
    { label: 'Returns', labelKey: 'ecommPortal.nav.returns', to: '/returns', icon: 'receipt' },
    { label: 'Customers', labelKey: 'ecommPortal.nav.customers', to: '/customers', icon: 'customers' },
    {
      label: 'Catalogue', labelKey: 'ecommPortal.nav.catalogue',
      icon: 'inventory',
      children: [
        { label: 'Products', labelKey: 'ecommPortal.nav.products', to: '/products', icon: 'product' },
        { label: 'Pet types', labelKey: 'ecommPortal.nav.petTypes', to: '/pet-types', icon: 'volunteer-activism' },
        { label: 'Categories', labelKey: 'ecommPortal.nav.categories', to: '/categories', icon: 'widgets' },
        { label: 'Filters', labelKey: 'ecommPortal.nav.filters', to: '/filters', icon: 'tune' },
        { label: 'Collections', labelKey: 'ecommPortal.nav.collections', to: '/collections', icon: 'storefront' },
      ],
    },
    {
      label: 'Storefront', labelKey: 'ecommPortal.nav.storefront',
      icon: 'storefront',
      children: [
        { label: 'Home page', labelKey: 'ecommPortal.nav.homePage', to: '/home-page', icon: 'image' },
        { label: 'Reviews', labelKey: 'ecommPortal.nav.reviews', to: '/reviews', icon: 'feedback' },
      ],
    },
    {
      label: 'Marketing', labelKey: 'ecommPortal.nav.marketing',
      icon: 'marketing',
      children: [
        { label: 'Coupons', labelKey: 'ecommPortal.nav.coupons', to: '/coupons', icon: 'percent' },
        { label: 'Abandoned carts', labelKey: 'ecommPortal.nav.carts', to: '/carts', icon: 'sales' },
        { label: 'Stock alerts', labelKey: 'ecommPortal.nav.stockAlerts', to: '/stock-alerts', icon: 'notifications' },
        { label: 'Autoship', labelKey: 'ecommPortal.nav.autoship', to: '/autoship', icon: 'timeline' },
      ],
    },
    { label: 'Settings', labelKey: 'ecommPortal.nav.settings', to: '/settings', icon: 'settings' },
  ],
  modules: [],
} satisfies AppConfig;
