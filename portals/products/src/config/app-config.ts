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
  promoTitle: 'Build what matters',
  promoText: 'Catalog, inventory and roadmap from one console.',
  portalLabel: 'Products Portal',
  loginImage:
    import.meta.env.VITE_LOGIN_IMAGE ||
    'https://images.pexels.com/photos/16782755/pexels-photo-16782755.jpeg',
  requiredRoles: parseEnvRoles(import.meta.env.VITE_REQUIRED_ROLES, ['PRODUCTS_MANAGER']),
  tokenKey: 'products_token',
  colorModeKey: 'products_color_mode',
  accent: { light: '#fdba74', main: '#ea580c', hover: '#c2410c', active: '#9a3412' },
  nav: [
    { label: 'Dashboard', labelKey: 'shell.nav.dashboard', to: '/', icon: 'dashboard' },
    {
      label: 'Catalog', labelKey: 'shell.nav.catalog',
      icon: 'inventory',
      children: [
        { label: 'Duncit Products', labelKey: 'shell.nav.duncitProducts', to: '/inventory', icon: 'inventory' },
        { label: 'Brands', labelKey: 'shell.nav.brands', to: '/catalog/brands', icon: 'storefront' },
      ],
    },
    {
      label: 'Brands & Products Review', labelKey: 'shell.nav.brandsAndProductsReview',
      icon: 'storefront',
      children: [
        { label: 'Brands Review', labelKey: 'shell.nav.brandsReview', to: '/ecomm/brands', icon: 'storefront' },
        { label: 'Products Reviews', labelKey: 'shell.nav.productsReviews', to: '/ecomm/product-requests', icon: 'rule' },
      ],
    },
    {
      label: 'Ecomm Requests', labelKey: 'shell.nav.ecommRequests',
      icon: 'inventory',
      children: [
        { label: 'Brand Request', labelKey: 'shell.nav.brandRequest', to: '/ecomm/brand-request', icon: 'storefront' },
        { label: 'Product Request', labelKey: 'shell.nav.productRequest', to: '/ecomm/product-request', icon: 'inventory' },
      ],
    },
    { label: 'Warehouse Approval', labelKey: 'shell.nav.warehouseApproval', to: '/warehouse-approval', icon: 'warehouse' },
    {
      label: 'Fulfilment', labelKey: 'shell.nav.fulfilment',
      icon: 'local_shipping',
      children: [{ label: 'Orders', labelKey: 'shell.nav.orders', to: '/orders', icon: 'local_shipping' }],
    },
    {
      label: 'Settings', labelKey: 'shell.nav.settings',
      icon: 'settings',
      children: [
        { label: 'Duncit Warehouse Locations', labelKey: 'shell.nav.duncitWarehouseLocations', to: '/settings/warehouses', icon: 'warehouse' },
        { label: 'Pod Shop Slider', labelKey: 'shell.nav.podShopSlider', to: '/settings/pod-shop-slider', icon: 'view_carousel' },
      ],
    },
  ],
  modules: [],
} satisfies AppConfig;
