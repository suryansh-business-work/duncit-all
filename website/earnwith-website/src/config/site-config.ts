// Single source of truth for the "Earn with Duncit" marketing site. Content
// lives here as reusable configuration (not business data). Cross-site URLs
// are resolved from the environment so localhost links stay local in dev and
// production links stay on the real domains.
const isDevelopment = import.meta.env.PUBLIC_IS_DEVELOPMENT === 'true';

const mwebUrl =
  import.meta.env.PUBLIC_MWEB_URL ||
  (isDevelopment ? 'http://localhost:2003' : 'https://mweb.duncit.com');

const graphqlUrl =
  import.meta.env.PUBLIC_GRAPHQL_URL ||
  (isDevelopment ? 'http://localhost:2001/graphql' : 'https://server.duncit.com/graphql');

const mainSiteUrl =
  import.meta.env.PUBLIC_MAIN_SITE_URL ||
  (isDevelopment ? 'http://localhost:2000' : 'https://duncit.com');

export interface EarnPath {
  icon: string;
  title: string;
  text: string;
  /** Duncit web-app survey-gate route this path opens. */
  href: string;
  cta: string;
}

export interface Step {
  icon: string;
  title: string;
  text: string;
}

export const siteConfig = {
  isDevelopment,
  mwebUrl,
  graphqlUrl,
  mainSiteUrl,
  brand: {
    name: 'Earn with Duncit',
    title: 'Earn with Duncit — host pods, list your venue or sell your products',
    description:
      'Turn your community, your space or your products into income on Duncit. Pick a way to start earning and Duncit takes it from there.',
  },
  hero: {
    eyebrow: 'Earn with Duncit',
    heading: 'Start earning with Duncit.',
    subheading:
      'Three ways to make money on Duncit — run paid pods, rent out your venue, or sell your products to the community. Get started in minutes.',
    primaryCta: { label: 'Start earning', href: `${mwebUrl}/earn` },
    secondaryCta: { label: 'See the ways', href: '#paths' },
  },
  // Mirrors the in-app Earn page — same three options, each deep-linking into
  // the matching survey gate.
  paths: [
    {
      icon: 'fa-people-group',
      title: 'By hosting a pod',
      text: 'Run meetups and experiences for your community and earn from paid pods.',
      href: `${mwebUrl}/survey/host`,
      cta: 'Become a host',
    },
    {
      icon: 'fa-store',
      title: 'By registering your venue',
      text: 'List your space as a Duncit venue and host pods or rent it out.',
      href: `${mwebUrl}/survey/venue`,
      cta: 'Register your venue',
    },
    {
      icon: 'fa-box-open',
      title: 'By listing your product',
      text: 'Sell your products to the Duncit community through pods and the shop.',
      href: `${mwebUrl}/survey/ecomm`,
      cta: 'List your product',
    },
  ] as EarnPath[],
  steps: [
    { icon: 'fa-hand-pointer', title: 'Pick a path', text: 'Choose hosting, your venue, or your products.' },
    { icon: 'fa-clipboard-list', title: 'Tell us about you', text: 'Fill a short survey in Duncit so we can set you up.' },
    { icon: 'fa-sack-dollar', title: 'Go live & earn', text: 'Get approved, publish, and start getting paid.' },
  ] as Step[],
  cta: {
    heading: 'Ready to turn what you have into income?',
    text: 'Open Duncit and choose how you want to earn.',
    button: { label: 'Start earning', href: `${mwebUrl}/earn` },
  },
  footer: {
    tagline: 'Earn with the Duncit community.',
    links: [
      { label: 'Duncit', href: mainSiteUrl },
      { label: 'Start earning', href: `${mwebUrl}/earn` },
      { label: 'Support', href: `${mainSiteUrl}/help` },
    ],
  },
};
