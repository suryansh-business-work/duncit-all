/** Canonical list of every Duncit service shown on the status page. */
export interface Service {
  name: string;
  url: string;
  description: string;
  /** Optional reachability probe path (defaults to the URL itself). */
  probe?: string;
  /** Optional rich health endpoint (JSON) surfaced in the Details dialog. */
  health?: string;
}

export interface ServiceGroup {
  title: string;
  items: Service[];
}

export const consoles: Service[] = [
  {
    name: 'Admin',
    url: 'https://admin.duncit.com/',
    description: 'Platform administration',
  },
  {
    name: 'mWeb',
    url: 'https://mweb.duncit.com/',
    description: 'Member web app',
  },
  {
    name: 'Partners App',
    url: 'https://partners-app.duncit.com/',
    description: 'Host & venue partners',
  },
  {
    name: 'Ads Portal',
    url: 'https://ads-portal.duncit.com/',
    description: 'Advertising & campaigns',
  },
  {
    name: 'CRM',
    url: 'https://crm.duncit.com/',
    description: 'Customer relationships',
  },
  {
    name: 'Finance',
    url: 'https://finance.duncit.com/',
    description: 'Payments & payouts',
  },
  {
    name: 'Tech',
    url: 'https://tech.duncit.com/',
    description: 'Platform configuration',
  },
  {
    name: 'Support',
    url: 'https://support.duncit.com/',
    description: 'Tickets & live chat',
  },
  {
    name: 'Website',
    url: 'https://website.duncit.com/',
    description: 'Site content management',
  },
  {
    name: 'Legal',
    url: 'https://legal.duncit.com/',
    description: 'Policies & compliance',
  },
  { name: 'AI', url: 'https://ai.duncit.com/', description: 'AI tooling' },
  {
    name: 'Products',
    url: 'https://products.duncit.com/',
    description: 'Catalog & inventory',
  },
  {
    name: 'Marketing',
    url: 'https://marketing.duncit.com/',
    description: 'Campaigns & notifications',
  },
  {
    name: 'Onboarding',
    url: 'https://onboarding.duncit.com/',
    description: 'Onboarding & approvals',
  },
  {
    name: 'HR',
    url: 'https://hr.duncit.com/',
    description: 'People & HR operations',
  },
  {
    name: 'Employee',
    url: 'https://employee.duncit.com/',
    description: 'Employee self-service',
  },
];

export const platform: Service[] = [
  {
    name: 'API Server',
    url: 'https://server.duncit.com/',
    description: 'GraphQL API',
    probe: 'https://server.duncit.com/health',
    health: 'https://server.duncit.com/health',
  },
  {
    name: 'SignOz',
    url: 'https://signoz.duncit.com/',
    description: 'Observability & monitoring',
  },
  {
    name: 'SonarQube',
    url: 'https://sonarqube.duncit.com/',
    description: 'Code quality & security analysis',
  },
];

export const websites: Service[] = [
  {
    name: 'duncit.com',
    url: 'https://duncit.com/',
    description: 'Public marketing website',
  },
  {
    name: 'Partners Website',
    url: 'https://partners.duncit.com/',
    description: 'Partner marketing website',
  },
  {
    name: 'Ads',
    url: 'https://ads.duncit.com/',
    description: 'Advertising marketing site',
  },
  {
    name: 'Native Web',
    url: 'https://native.duncit.com/',
    description: 'Mobile web app',
  },
];

export const groups: ServiceGroup[] = [
  { title: 'Consoles', items: consoles },
  { title: 'Platform', items: platform },
  { title: 'Websites', items: websites },
];
