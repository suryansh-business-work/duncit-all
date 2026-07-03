// Single source of truth for the Duncit Ads marketing site. Content lives here
// as reusable configuration (not business data), and the portal URL is resolved
// from the environment so deployments stay dynamic without a code change.
const isDevelopment = import.meta.env.PUBLIC_IS_DEVELOPMENT === 'true';

// Localhost targets in dev, production hosts otherwise — every cross-site
// link goes through this map so environments never leak into each other.
const portalUrl =
  import.meta.env.PUBLIC_ADS_PORTAL_URL ||
  (isDevelopment ? 'http://localhost:2006' : 'https://ads-portal.duncit.com');

const graphqlUrl =
  import.meta.env.PUBLIC_GRAPHQL_URL ||
  (isDevelopment ? 'http://localhost:2001/graphql' : 'https://server.duncit.com/graphql');

const mainSiteUrl =
  import.meta.env.PUBLIC_MAIN_SITE_URL ||
  (isDevelopment ? 'http://localhost:2000' : 'https://duncit.com');

export interface Feature {
  icon: string;
  title: string;
  text: string;
}

export const siteConfig = {
  isDevelopment,
  portalUrl,
  graphqlUrl,
  mainSiteUrl,
  brand: {
    name: 'Duncit Ads',
    title: 'Duncit Ads — advertise where your audience actually shows up',
    description:
      'Plan, launch and measure advertising campaigns across the Duncit network from one console.',
  },
  hero: {
    eyebrow: 'Duncit Ads',
    heading: 'Reach the right crowd, in real time.',
    subheading:
      'Build campaigns, manage creatives and track performance across the Duncit network — all from one fast, focused console.',
    primaryCta: { label: 'Open Ads Console', href: portalUrl },
    secondaryCta: { label: 'See how it works', href: '#features' },
  },
  features: [
    { icon: 'fa-bullhorn', title: 'Campaigns', text: 'Create, schedule and manage ad campaigns across every placement.' },
    { icon: 'fa-image', title: 'Creatives', text: 'Upload, organise and A/B test banners, media and creative variants.' },
    { icon: 'fa-chart-line', title: 'Performance', text: 'Monitor impressions, clicks, CTR and spend with live reporting.' },
    { icon: 'fa-users', title: 'Audiences', text: 'Build, segment and target reusable audience lists with precision.' },
  ] as Feature[],
  cta: {
    heading: 'Ready to launch your first campaign?',
    text: 'Sign in to the Ads console and go live in minutes.',
    button: { label: 'Get started', href: portalUrl },
  },
  footer: {
    tagline: 'Advertising for the Duncit network.',
    links: [
      { label: 'Duncit', href: mainSiteUrl },
      { label: 'Ads Console', href: portalUrl },
      { label: 'Support', href: `${mainSiteUrl}/help` },
    ],
  },
};
