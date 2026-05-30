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
}

export const PORTAL_REGISTRY: PortalRegistryEntry[] = [
  { key: 'admin', name: 'Admin', kind: 'PORTAL' },
  { key: 'tech', name: 'Tech', kind: 'PORTAL' },
  { key: 'finance', name: 'Finance', kind: 'PORTAL' },
  { key: 'support', name: 'Support', kind: 'PORTAL' },
  { key: 'crm', name: 'CRM', kind: 'PORTAL' },
  { key: 'ads', name: 'Ads', kind: 'PORTAL' },
  { key: 'marketing', name: 'Marketing', kind: 'PORTAL' },
  { key: 'website-app', name: 'Website Console', kind: 'PORTAL' },
  { key: 'legal', name: 'Legal', kind: 'PORTAL' },
  { key: 'ai', name: 'AI', kind: 'PORTAL' },
  { key: 'products', name: 'Products', kind: 'PORTAL' },
  { key: 'onboarding', name: 'Onboarding', kind: 'PORTAL' },
  { key: 'hr', name: 'HR', kind: 'PORTAL' },
  { key: 'employee', name: 'Employee', kind: 'PORTAL' },
  { key: 'partners', name: 'Partners App', kind: 'PORTAL' },
  { key: 'mweb', name: 'mWeb (Member App)', kind: 'APP' },
  { key: 'website', name: 'duncit.com (Website)', kind: 'WEBSITE' },
  { key: 'partners-website', name: 'Partners Website', kind: 'WEBSITE' },
];
