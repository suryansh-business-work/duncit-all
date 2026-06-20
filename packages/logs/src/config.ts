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
] as const;
export type PortalKey = (typeof PORTALS)[number];

// Public/marketing static sites (Astro). logs.website.<name>.
export const WEBSITES = ['duncit', 'partners', 'ads', 'status', 'earnwith'] as const;
export type WebsiteKey = (typeof WEBSITES)[number];
