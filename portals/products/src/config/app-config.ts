import { parseEnvRoles, type AppConfig } from '@duncit/shell';

/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). `requiredRoles` is overridable
 * via `VITE_REQUIRED_ROLES` so access control stays dynamic.
 */
export const appConfig = {
  key: 'products',
  name: 'Products',
  fullName: 'Duncit Products',
  tagline: 'Manage the product catalog and roadmap.',
  promoTitle: "Build what matters",
  promoText: "Catalog, inventory and roadmap from one console.",
  portalLabel: 'Products Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/16782755/pexels-photo-16782755.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['PRODUCTS_MANAGER']),
  tokenKey: 'products_token',
  colorModeKey: 'products_color_mode',
  accent: { light: '#fdba74', main: '#ea580c', hover: '#c2410c', active: '#9a3412' },
  nav: [
    { label: 'Dashboard', to: '/', icon: 'dashboard' },
    {
      label: 'Catalog',
      icon: 'inventory',
      children: [{ label: 'Duncit Products', to: '/inventory', icon: 'inventory' }],
    },
    {
      label: 'E-commerce',
      icon: 'storefront',
      children: [
        { label: 'Brands', to: '/ecomm/brands', icon: 'storefront' },
        { label: 'Listing Reviews', to: '/ecomm/product-requests', icon: 'rule' },
      ],
    },
    {
      label: 'Ecomm Requests',
      icon: 'inventory',
      children: [
        { label: 'Brand Request', to: '/ecomm/brand-request', icon: 'storefront' },
        { label: 'Product Request', to: '/ecomm/product-request', icon: 'inventory' },
      ],
    },
    {
      label: 'Fulfilment',
      icon: 'local_shipping',
      children: [{ label: 'Orders', to: '/orders', icon: 'local_shipping' }],
    },
    {
      label: 'Settings',
      icon: 'settings',
      children: [{ label: 'Duncit Warehouse Locations', to: '/settings/warehouses', icon: 'warehouse' }],
    },
  ],
  modules: [],
} satisfies AppConfig;
