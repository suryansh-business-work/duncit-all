// Single global source of truth for the app + portal identifiers that every
// log call is tagged with. Add a new console here and it automatically gets a
// `logs.portal.<name>` logger.
export const APPS = ['server', 'mWeb', 'mobileApp'] as const;
export type AppKey = (typeof APPS)[number];

export const PORTALS = [
  'admin',
  'crm',
  'finance',
  'tech',
  'support',
  'website-app',
  'legal',
  'ai',
  'products',
  'marketing',
  'onboarding',
  'hr',
  'employee',
  'ads-portal',
  'partners-app',
  'challenge-portal',
  'developers-portal',
] as const;
export type PortalKey = (typeof PORTALS)[number];

// Public/marketing static sites (Astro). logs.website.<name>.
export const WEBSITES = ['duncit', 'partners', 'ads', 'status', 'earnwith'] as const;
export type WebsiteKey = (typeof WEBSITES)[number];

import type { Environment } from './types';

/**
 * Classify a host (or full URL) into the SignOz `environment` bucket:
 *   localhost / 127.* / *.local / empty  → 'localhost'
 *   any host containing 'staging'         → 'staging'
 *   everything else                       → 'production'
 * Works for both `staging.crm.duncit.com` and a bare `localhost:5173`.
 */
export function detectEnvironment(hostOrUrl?: string | null): Environment {
  let host = (hostOrUrl ?? '').toLowerCase().trim();
  if (host.includes('://')) {
    try {
      host = new URL(host).hostname;
    } catch {
      /* fall through with the raw string */
    }
  }
  // IPv6 loopback (::1, [::1], with/without port) or nothing → local.
  if (!host || host.includes('::1')) return 'localhost';
  const bare = host.replace(/:\d+$/, ''); // strip a trailing :port
  if (bare === 'localhost' || bare.startsWith('127.') || bare.endsWith('.local')) {
    return 'localhost';
  }
  if (bare.includes('staging')) return 'staging';
  return 'production';
}
