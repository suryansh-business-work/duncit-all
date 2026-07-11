/**
 * Per-app configuration. Single source of truth for the shared shell
 * (layout, login gating, theme accent, nav). `requiredRoles` is overridable
 * via `VITE_REQUIRED_ROLES` so access control stays dynamic.
 */
export interface AppNavItem {
  label: string;
  to?: string;
  icon?: string;
  /** Nested items — rendered by the shared shell as a collapsible group. */
  children?: AppNavItem[];
}

export interface AppModule {
  title: string;
  description: string;
  icon: string;
}

export interface AccentColors {
  light: string;
  main: string;
  hover: string;
  active: string;
}

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
  requiredRoles: envRoles.length ? envRoles : ['PRODUCTS_MANAGER'],
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
  ],
  modules: [],
};
