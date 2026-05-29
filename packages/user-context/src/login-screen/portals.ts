/** Registry of Duncit consoles for the "Other portals" launcher dialog. */
export interface PortalEntry {
  key: string;
  name: string;
  description: string;
  /** Vite dev-server port (used on localhost). */
  port: number;
  /** Production subdomain under duncit.com. */
  subdomain: string;
  /** Icon name resolved by OtherPortalsDialog. */
  icon: string;
}

export const PORTALS: PortalEntry[] = [
  { key: 'admin', name: 'Admin', description: 'Platform administration — users, catalog and access control.', port: 2002, subdomain: 'admin', icon: 'admin' },
  { key: 'crm', name: 'CRM', description: 'Leads, contacts and customer conversations.', port: 2007, subdomain: 'crm', icon: 'crm' },
  { key: 'ads', name: 'Ads', description: 'Advertising creatives and campaign delivery.', port: 2006, subdomain: 'ads', icon: 'ads' },
  { key: 'finance', name: 'Finance', description: 'Payments, payouts, invoices and reconciliation.', port: 2008, subdomain: 'finance', icon: 'finance' },
  { key: 'tech', name: 'Tech', description: 'Environment, feature flags and platform config.', port: 2009, subdomain: 'tech', icon: 'tech' },
  { key: 'support', name: 'Support', description: 'Tickets, live chat and customer support.', port: 2010, subdomain: 'support', icon: 'support' },
  { key: 'website-app', name: 'Website', description: 'Site content, careers, newsroom and blog.', port: 2011, subdomain: 'website', icon: 'website' },
  { key: 'legal', name: 'Legal', description: 'Policies, agreements and compliance records.', port: 2012, subdomain: 'legal', icon: 'legal' },
  { key: 'ai', name: 'AI', description: 'Models, prompts and AI tooling.', port: 2013, subdomain: 'ai', icon: 'ai' },
  { key: 'products', name: 'Products', description: 'Catalog, inventory and product roadmap.', port: 2014, subdomain: 'products', icon: 'products' },
  { key: 'marketing', name: 'Marketing', description: 'Campaigns, notifications and audiences.', port: 2015, subdomain: 'marketing', icon: 'marketing' },
  { key: 'partners', name: 'Partners', description: 'Host and venue onboarding and management.', port: 2005, subdomain: 'partners-app', icon: 'partners' },
];

/** Resolves a portal URL: localhost:<port> in dev, https://<sub>.duncit.com in prod. */
export function resolvePortalUrl(p: PortalEntry): string {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(host);
  return isLocal ? `http://localhost:${p.port}/` : `https://${p.subdomain}.duncit.com/`;
}
