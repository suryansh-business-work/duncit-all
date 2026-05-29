/** Registry of Duncit consoles for the "Other portals" launcher dialog. */
export interface PortalEntry {
  key: string;
  name: string;
  description: string;
  /** Vite dev-server port (used on localhost). */
  port: number;
  /** Production subdomain under duncit.com. */
  subdomain: string;
  /** Login-page background image (shown compact in the launcher). */
  image: string;
}

const PEXELS = (id: string) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=160&h=160&fit=crop`;

export const PORTALS: PortalEntry[] = [
  { key: 'admin', name: 'Admin', description: 'Platform administration — users, catalog and access control.', port: 2002, subdomain: 'admin', image: PEXELS('36713016') },
  { key: 'crm', name: 'CRM', description: 'Leads, contacts and customer conversations.', port: 2007, subdomain: 'crm', image: PEXELS('7658434') },
  { key: 'ads', name: 'Ads', description: 'Advertising creatives and campaign delivery.', port: 2006, subdomain: 'ads', image: PEXELS('3183153') },
  { key: 'finance', name: 'Finance', description: 'Payments, payouts, invoices and reconciliation.', port: 2008, subdomain: 'finance', image: PEXELS('7869097') },
  { key: 'tech', name: 'Tech', description: 'Environment, feature flags and platform config.', port: 2009, subdomain: 'tech', image: PEXELS('6804068') },
  { key: 'support', name: 'Support', description: 'Tickets, live chat and customer support.', port: 2010, subdomain: 'support', image: PEXELS('5453823') },
  { key: 'website-app', name: 'Website', description: 'Site content, careers, newsroom and blog.', port: 2011, subdomain: 'website', image: PEXELS('8524940') },
  { key: 'legal', name: 'Legal', description: 'Policies, agreements and compliance records.', port: 2012, subdomain: 'legal', image: PEXELS('7841459') },
  { key: 'ai', name: 'AI', description: 'Models, prompts and AI tooling.', port: 2013, subdomain: 'ai', image: PEXELS('5473956') },
  { key: 'products', name: 'Products', description: 'Catalog, inventory and product roadmap.', port: 2014, subdomain: 'products', image: PEXELS('16782755') },
  { key: 'marketing', name: 'Marketing', description: 'Campaigns, notifications and audiences.', port: 2015, subdomain: 'marketing', image: PEXELS('7693745') },
  { key: 'partners', name: 'Partners', description: 'Host and venue onboarding and management.', port: 2005, subdomain: 'partners-app', image: PEXELS('4963388') },
];

/** Resolves a portal URL: localhost:<port> in dev, https://<sub>.duncit.com in prod. */
export function resolvePortalUrl(p: PortalEntry): string {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(host);
  return isLocal ? `http://localhost:${p.port}/` : `https://${p.subdomain}.duncit.com/`;
}
