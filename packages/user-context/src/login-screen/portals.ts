/** Registry of Duncit consoles for the "Other portals" launcher dialog. */
export interface PortalEntry {
  key: string;
  /** The console's own name — a brand mark, shown as written. */
  name: string;
  /** Catalogue key for the line saying what the console is for (rule 38). */
  descriptionKey: string;
  /** Vite dev-server port (used on localhost). */
  port: number;
  /** Production subdomain under duncit.com. */
  subdomain: string;
  /** Grouping used by the launcher's category filter. */
  category: PortalCategory;
  /** Login-page background image (shown compact in the launcher). */
  image: string;
}

/** A category filter chip: the value the entries carry, and its copy. */
export interface PortalCategoryOption {
  key: PortalCategory;
  labelKey: string;
}

export type PortalCategory =
  | 'operations'
  | 'growth'
  | 'contentAi'
  | 'people'
  | 'partners';

const PEXELS = (id: string) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=160&h=160&fit=crop`;

export const PORTAL_CATEGORIES: readonly PortalCategoryOption[] = [
  { key: 'operations', labelKey: 'session.portals.categories.operations' },
  { key: 'growth', labelKey: 'session.portals.categories.growth' },
  { key: 'contentAi', labelKey: 'session.portals.categories.contentAi' },
  { key: 'people', labelKey: 'session.portals.categories.people' },
  { key: 'partners', labelKey: 'session.portals.categories.partners' },
];

export const PORTALS: PortalEntry[] = [
  { key: 'admin', name: 'Admin', descriptionKey: 'session.portals.descriptions.admin', port: 2002, subdomain: 'admin', category: 'operations', image: PEXELS('36713016') },
  { key: 'tech', name: 'Tech', descriptionKey: 'session.portals.descriptions.tech', port: 2009, subdomain: 'tech', category: 'operations', image: PEXELS('6804068') },
  { key: 'finance', name: 'Finance', descriptionKey: 'session.portals.descriptions.finance', port: 2008, subdomain: 'finance', category: 'operations', image: PEXELS('7869097') },
  { key: 'support', name: 'Support', descriptionKey: 'session.portals.descriptions.support', port: 2010, subdomain: 'support', category: 'operations', image: PEXELS('5453823') },
  { key: 'crm', name: 'CRM', descriptionKey: 'session.portals.descriptions.crm', port: 2007, subdomain: 'crm', category: 'growth', image: PEXELS('7658434') },
  { key: 'ads', name: 'Ads', descriptionKey: 'session.portals.descriptions.ads', port: 2006, subdomain: 'ads-portal', category: 'growth', image: PEXELS('3183153') },
  { key: 'marketing', name: 'Marketing', descriptionKey: 'session.portals.descriptions.marketing', port: 2015, subdomain: 'marketing', category: 'growth', image: PEXELS('7693745') },
  { key: 'challenge', name: 'Challenges', descriptionKey: 'session.portals.descriptions.challenge', port: 2026, subdomain: 'challenge', category: 'growth', image: PEXELS('863988') },
  { key: 'developers', name: 'Developers', descriptionKey: 'session.portals.descriptions.developers', port: 2027, subdomain: 'developers', category: 'contentAi', image: PEXELS('574071') },
  { key: 'website-app', name: 'Website', descriptionKey: 'session.portals.descriptions.websiteApp', port: 2011, subdomain: 'website', category: 'contentAi', image: PEXELS('8524940') },
  { key: 'legal', name: 'Legal', descriptionKey: 'session.portals.descriptions.legal', port: 2012, subdomain: 'legal', category: 'contentAi', image: PEXELS('7841459') },
  { key: 'ai', name: 'AI', descriptionKey: 'session.portals.descriptions.ai', port: 2013, subdomain: 'ai', category: 'contentAi', image: PEXELS('5473956') },
  { key: 'products', name: 'Products', descriptionKey: 'session.portals.descriptions.products', port: 2014, subdomain: 'products', category: 'contentAi', image: PEXELS('16782755') },
  { key: 'onboarding', name: 'Onboarding', descriptionKey: 'session.portals.descriptions.onboarding', port: 2016, subdomain: 'onboarding', category: 'people', image: PEXELS('7857197') },
  { key: 'hr', name: 'HR', descriptionKey: 'session.portals.descriptions.hr', port: 2017, subdomain: 'hr', category: 'people', image: PEXELS('3184292') },
  { key: 'employee', name: 'Employee', descriptionKey: 'session.portals.descriptions.employee', port: 2018, subdomain: 'employee', category: 'people', image: PEXELS('4974915') },
  { key: 'partners', name: 'Partners', descriptionKey: 'session.portals.descriptions.partners', port: 2005, subdomain: 'partners-app', category: 'partners', image: PEXELS('4963388') },
];

/** Resolves a portal URL: localhost:<port> in dev, https://<sub>.duncit.com in prod. */
export function resolvePortalUrl(p: PortalEntry): string {
  const host = globalThis.window === undefined ? '' : globalThis.window.location.hostname;
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(host);
  return isLocal ? `http://localhost:${p.port}/` : `https://${p.subdomain}.duncit.com/`;
}
