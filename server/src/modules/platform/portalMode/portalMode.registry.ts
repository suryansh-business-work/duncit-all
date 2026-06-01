import type { PortalKind } from './portalMode.model';

/**
 * Single source of truth for every Duncit surface that can be toggled into
 * maintenance / development mode: internal portals, public websites and the
 * member web app. `key` must match the `appConfig.key` each frontend passes to
 * the shared PortalModeGate (and the key the Astro sites use).
 */
export interface PortalRegistryEntry {
  key: string;
  name: string;
  kind: PortalKind;
  /** Public URL of the surface, shown as a link on the Maintenance page. */
  url: string;
}

export const PORTAL_REGISTRY: PortalRegistryEntry[] = [
  { key: 'admin', name: 'Admin', kind: 'PORTAL', url: 'https://admin.duncit.com/' },
  { key: 'tech', name: 'Tech', kind: 'PORTAL', url: 'https://tech.duncit.com/' },
  { key: 'finance', name: 'Finance', kind: 'PORTAL', url: 'https://finance.duncit.com/' },
  { key: 'support', name: 'Support', kind: 'PORTAL', url: 'https://support.duncit.com/' },
  { key: 'crm', name: 'CRM', kind: 'PORTAL', url: 'https://crm.duncit.com/' },
  { key: 'ads', name: 'Ads', kind: 'PORTAL', url: 'https://ads.duncit.com/' },
  { key: 'marketing', name: 'Marketing', kind: 'PORTAL', url: 'https://marketing.duncit.com/' },
  { key: 'website-app', name: 'Website Console', kind: 'PORTAL', url: 'https://website.duncit.com/' },
  { key: 'legal', name: 'Legal', kind: 'PORTAL', url: 'https://legal.duncit.com/' },
  { key: 'ai', name: 'AI', kind: 'PORTAL', url: 'https://ai.duncit.com/' },
  { key: 'products', name: 'Products', kind: 'PORTAL', url: 'https://products.duncit.com/' },
  { key: 'onboarding', name: 'Onboarding', kind: 'PORTAL', url: 'https://onboarding.duncit.com/' },
  { key: 'hr', name: 'HR', kind: 'PORTAL', url: 'https://hr.duncit.com/' },
  { key: 'employee', name: 'Employee', kind: 'PORTAL', url: 'https://employee.duncit.com/' },
  { key: 'partners', name: 'Partners App', kind: 'PORTAL', url: 'https://partners-app.duncit.com/' },
  { key: 'mweb', name: 'mWeb (Member App)', kind: 'APP', url: 'https://mweb.duncit.com/' },
  { key: 'website', name: 'duncit.com (Website)', kind: 'WEBSITE', url: 'https://duncit.com/' },
  { key: 'partners-website', name: 'Partners Website', kind: 'WEBSITE', url: 'https://partners.duncit.com/' },
];
