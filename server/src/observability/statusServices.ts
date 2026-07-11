/**
 * Canonical catalog of every Duncit service monitored by the status page.
 *
 * The status site (status.duncit.com) fetches this list from `/status/services`
 * and the scheduler probes each entry every 5 minutes, so the catalog lives
 * server-side as the single source of truth.
 *
 * Environment-aware: when APP_ENV=staging every `*.duncit.com` host is
 * rewritten to its `staging.*` equivalent, and services that have no staging
 * deployment (SignOz, SonarQube) are excluded entirely.
 */

export interface StatusService {
  /** Stable slug used as the StatusCheck.service_key. */
  key: string;
  name: string;
  url: string;
  description: string;
  /** Optional reachability probe url (defaults to the URL itself). */
  probe?: string;
  /** Optional rich health endpoint (JSON) surfaced in the Details dialog. */
  health?: string;
}

export interface StatusServiceGroup {
  title: string;
  items: StatusService[];
}

/** Services with no staging deployment — excluded entirely in staging mode. */
const NO_STAGING_KEYS = new Set(['signoz', 'sonarqube']);

const consoles: StatusService[] = [
  { key: 'admin', name: 'Admin', url: 'https://admin.duncit.com/', description: 'Platform administration' },
  { key: 'mweb', name: 'mWeb', url: 'https://mweb.duncit.com/', description: 'Member web app' },
  { key: 'partners-app', name: 'Partners App', url: 'https://partners-app.duncit.com/', description: 'Host & venue partners' },
  { key: 'ads-portal', name: 'Ads Portal', url: 'https://ads-portal.duncit.com/', description: 'Advertising & campaigns' },
  { key: 'crm', name: 'CRM', url: 'https://crm.duncit.com/', description: 'Customer relationships' },
  { key: 'finance', name: 'Finance', url: 'https://finance.duncit.com/', description: 'Payments & payouts' },
  { key: 'tech', name: 'Tech', url: 'https://tech.duncit.com/', description: 'Platform configuration' },
  { key: 'support', name: 'Support', url: 'https://support.duncit.com/', description: 'Tickets & live chat' },
  { key: 'website', name: 'Website', url: 'https://website.duncit.com/', description: 'Site content management' },
  { key: 'legal', name: 'Legal', url: 'https://legal.duncit.com/', description: 'Policies & compliance' },
  { key: 'ai', name: 'AI', url: 'https://ai.duncit.com/', description: 'AI tooling' },
  { key: 'challenge', name: 'Challenges', url: 'https://challenge.duncit.com/', description: 'Challenge management' },
  { key: 'products', name: 'Products', url: 'https://products.duncit.com/', description: 'Catalog & inventory' },
  { key: 'marketing', name: 'Marketing', url: 'https://marketing.duncit.com/', description: 'Campaigns & notifications' },
  { key: 'onboarding', name: 'Onboarding', url: 'https://onboarding.duncit.com/', description: 'Onboarding & approvals' },
  { key: 'hr', name: 'HR', url: 'https://hr.duncit.com/', description: 'People & HR operations' },
  { key: 'employee', name: 'Employee', url: 'https://employee.duncit.com/', description: 'Employee self-service' },
];

const platform: StatusService[] = [
  {
    key: 'server',
    name: 'API Server',
    url: 'https://server.duncit.com/',
    description: 'GraphQL API',
    probe: 'https://server.duncit.com/health',
    health: 'https://server.duncit.com/health',
  },
  { key: 'signoz', name: 'SignOz', url: 'https://signoz.duncit.com/', description: 'Observability & monitoring' },
  { key: 'sonarqube', name: 'SonarQube', url: 'https://sonarqube.duncit.com/', description: 'Code quality & security analysis' },
  { key: 'open-wa-server', name: 'OpenWA Server', url: 'https://open-wa-server.duncit.com/', description: 'CRM WhatsApp lead gateway' },
];

const websites: StatusService[] = [
  { key: 'duncit-com', name: 'duncit.com', url: 'https://duncit.com/', description: 'Public marketing website' },
  { key: 'partners', name: 'Partners Website', url: 'https://partners.duncit.com/', description: 'Partner marketing website' },
  { key: 'ads', name: 'Ads', url: 'https://ads.duncit.com/', description: 'Advertising marketing site' },
  { key: 'native', name: 'Native Web', url: 'https://native.duncit.com/', description: 'Mobile web app' },
  { key: 'earnwith', name: 'Earn with Duncit', url: 'https://earnwith.duncit.com/', description: 'Earn with Duncit marketing site' },
];

const groups: StatusServiceGroup[] = [
  { title: 'Consoles', items: consoles },
  { title: 'Platform', items: platform },
  { title: 'Websites', items: websites },
];

export type StatusEnvironment = 'production' | 'staging';

export function getStatusEnvironment(): StatusEnvironment {
  return process.env.APP_ENV === 'staging' ? 'staging' : 'production';
}

/** admin.duncit.com → staging.admin.duncit.com; duncit.com → staging.duncit.com. */
function toStagingUrl(raw: string): string {
  const url = new URL(raw);
  url.hostname = `staging.${url.hostname}`;
  return url.toString();
}

function toStagingService(service: StatusService): StatusService {
  return {
    ...service,
    url: toStagingUrl(service.url),
    ...(service.probe ? { probe: toStagingUrl(service.probe) } : {}),
    ...(service.health ? { health: toStagingUrl(service.health) } : {}),
  };
}

/**
 * The monitored-service catalog for the current environment. Production
 * returns the list unchanged; staging rewrites hosts and drops services
 * without a staging deployment.
 */
export function getStatusServices(): StatusServiceGroup[] {
  if (getStatusEnvironment() !== 'staging') return groups;
  return groups.map((group) => ({
    title: group.title,
    items: group.items
      .filter((service) => !NO_STAGING_KEYS.has(service.key))
      .map(toStagingService),
  }));
}

/** Flat list of all monitored services for the current environment. */
export function listStatusServices(): StatusService[] {
  return getStatusServices().flatMap((group) => group.items);
}

/** Look up one service by its key (current environment), or null. */
export function findStatusService(key: string): StatusService | null {
  return listStatusServices().find((service) => service.key === key) ?? null;
}
