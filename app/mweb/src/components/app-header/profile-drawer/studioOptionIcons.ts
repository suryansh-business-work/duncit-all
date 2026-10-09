import type { StudioOptionIcon } from '@duncit/utils';
import type { ProfileIconKey } from './profileSections';

/**
 * The studio options' semantic icons (@duncit/utils studio-options), drawn
 * with this app's drawer glyphs — the Options pages and the drawer share one
 * icon vocabulary, so a destination wears the same glyph wherever it is listed.
 */
export const STUDIO_OPTION_ICON: Readonly<Record<StudioOptionIcon, ProfileIconKey>> = {
  dashboard: 'dashboard',
  venue: 'venue',
  pods: 'pods',
  create: 'create',
  autopods: 'autopods',
  calendar: 'calendar',
  availability: 'availability',
  settings: 'settings',
  earnings: 'insights',
  publish: 'publish',
  change: 'change',
  requests: 'requests',
  nearby: 'nearby',
  verification: 'verification',
  wallet: 'wallet',
  clubs: 'clubs',
  monitoring: 'monitoring',
  brands: 'ecomm',
  integrations: 'integrations',
  returns: 'returns',
  // The brand desk: its Pod Shop orders wear the shipping truck the buyer's
  // own orders do, its pickup addresses a warehouse.
  orders: 'orders',
  warehouses: 'warehouses',
};
