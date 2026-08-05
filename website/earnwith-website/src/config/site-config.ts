// Single source of truth for the "Earn with Duncit" marketing site. Content
// lives here as reusable configuration (not business data). Cross-site URLs
// are resolved from the environment so localhost links stay local in dev and
// production links stay on the real domains.
// `astro dev` is local by definition, so a dev server targets the local API
// without anyone remembering a flag — running the site locally against the
// production server is how a missing local change looks like a broken page.
// PUBLIC_IS_DEVELOPMENT still forces the dev targets for a built preview.
const isDevelopment = import.meta.env.DEV || import.meta.env.PUBLIC_IS_DEVELOPMENT === 'true';

const mwebUrl =
  import.meta.env.PUBLIC_MWEB_URL ||
  (isDevelopment ? 'http://localhost:2003' : 'https://mweb.duncit.com');

const graphqlUrl =
  import.meta.env.PUBLIC_GRAPHQL_URL ||
  (isDevelopment ? 'http://localhost:2001/graphql' : 'https://server.duncit.com/graphql');

const mainSiteUrl =
  import.meta.env.PUBLIC_MAIN_SITE_URL ||
  (isDevelopment ? 'http://localhost:2000' : 'https://duncit.com');

/** Stock photography is served through Pexels' own resizer rather than at full
 * resolution — the originals are several megabytes each. */
const photo = (id: string, width: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;

export interface EarnPath {
  icon: string;
  title: string;
  text: string;
  image: string;
  imageAlt: string;
  /** Duncit web-app survey-gate route this path opens. */
  href: string;
  cta: string;
}

export interface Step {
  icon: string;
  title: string;
  text: string;
}

export interface WhyItem {
  icon: string;
  label: string;
}

export const siteConfig = {
  isDevelopment,
  mwebUrl,
  graphqlUrl,
  mainSiteUrl,
  brand: {
    name: 'Earn with Duncit',
    title: 'Earn with Duncit — host, list your venue, run a club or sell your brand',
    description:
      'Turn your network into income on Duncit. Host experiences, list your venue, manage a club or put your brand in front of engaged communities.',
  },
  nav: {
    // On-page anchors for what this site itself answers; the rest live on the
    // main site, so the header links across instead of duplicating them.
    links: [
      { label: 'About Us', href: `${mainSiteUrl}/about` },
      { label: 'How It Works', href: '#how' },
      { label: 'Earn With Duncit', href: '#paths' },
      { label: 'Resources', href: `${mainSiteUrl}/safety/resources` },
      { label: 'Blog', href: `${mainSiteUrl}/blog` },
    ],
    login: { label: 'Log In', href: `${mwebUrl}/login` },
    signup: { label: 'Sign Up', href: `${mwebUrl}/register` },
  },
  hero: {
    eyebrow: 'Earn With Duncit',
    heading: 'Turn Your Network Into Income',
    paragraphs: [
      'Join a community of hosts, venues, clubs and brands earning together.',
      'Create experiences. Build connections. Earn on your terms.',
    ],
    primaryCta: { label: 'Start Earning', href: `${mwebUrl}/earn` },
    secondaryCta: { label: 'Explore Opportunities', href: '#paths' },
    // Full-bleed banner behind the header, so it is requested at a width that
    // survives a desktop viewport.
    image: photo('34766307', 1920),
    imageAlt: 'People meeting over drinks at a Duncit pod',
    /** Rides the 3D band under the banner, scrolling past on a loop. */
    ribbon: [
      'Build Communities',
      'Create Experiences',
      'Earn Together',
      'Grow Your Business',
      'Repeat',
    ],
  },
  // The same four journeys the app offers, each deep-linking into its survey
  // gate — the site and the Earn screen must not drift apart.
  paths: [
    {
      icon: 'fa-building',
      title: 'Register Your Venue',
      text: 'List your venue, manage your availability and receive booking requests from hosts.',
      image: photo('2813132', 800),
      imageAlt: 'A venue courtyard set up for an event',
      href: `${mwebUrl}/survey/venue`,
      cta: 'Become Venue Partner',
    },
    {
      icon: 'fa-user',
      title: 'Become a Host',
      text: 'Host events, workshops, sports meets or parties and earn from every booking.',
      image: photo('34766307', 800),
      imageAlt: 'A host welcoming guests',
      href: `${mwebUrl}/survey/host`,
      cta: 'Become Host',
    },
    {
      icon: 'fa-people-group',
      title: 'Club Admin',
      text: 'Build and manage your club or community and earn through memberships and events.',
      image: photo('8111879', 800),
      imageAlt: 'A club admin working on a laptop',
      href: `${mwebUrl}/survey/club_admin`,
      cta: 'Become Club Admin',
    },
    {
      icon: 'fa-tag',
      title: 'List Your Brand',
      text: 'Promote your brand, sponsor events and connect with highly engaged communities.',
      image: photo('13013767', 800),
      imageAlt: 'A brand owner at their store',
      href: `${mwebUrl}/survey/ecomm`,
      cta: 'Partner With Us',
    },
  ] as EarnPath[],
  why: {
    eyebrow: 'Why choose Duncit?',
    items: [
      { icon: 'fa-gift', label: 'Easy & Free To Get Started' },
      { icon: 'fa-wallet', label: 'Direct Payments' },
      { icon: 'fa-shield-halved', label: 'Trusted Community' },
      { icon: 'fa-wand-magic-sparkles', label: 'Smart Matching' },
      { icon: 'fa-bullhorn', label: 'Marketing Support' },
    ] as WhyItem[],
  },
  steps: {
    eyebrow: 'How it works',
    heading: 'Start Earning in 5 Simple Steps',
    items: [
      { icon: 'fa-user-plus', title: 'Register', text: 'Create your free Duncit account.' },
      { icon: 'fa-address-card', title: 'Verification', text: 'Submit details and get verified.' },
      { icon: 'fa-shield-halved', title: 'Get Approved', text: 'We review and approve your profile.' },
      { icon: 'fa-calendar-check', title: 'Receive Bookings', text: 'Get booking requests from real users.' },
      { icon: 'fa-wallet', title: 'Earn', text: 'Provide great experiences and earn every month.' },
    ] as Step[],
  },
  // The estimator's inputs. The RATES are not here on purpose — GST, the
  // platform fee and the rest come from the server's settlement waterfall, so
  // this page cannot state a percentage the platform no longer charges.
  calculator: {
    eyebrow: 'Estimate your earnings',
    heading: 'What would a pod pay you?',
    text:
      'Move the sliders and see what reaches you after GST, the platform fee and what the venue charges. Your own seat is free, so a pod bills every spot but yours.',
    currency: '₹',
    takeHomeLabel: 'You take home',
    rowLabels: {
      gross: 'Tickets collected',
      gst: 'GST',
      platform: 'Platform fee',
      venue: 'Venue charge',
    },
    note: 'An estimate at standard rates. Your own rate, and a venue’s own price, are set when you create the pod.',
    fields: [
      {
        name: 'ticket',
        label: 'Ticket price per spot',
        prefix: '₹',
        min: 99,
        max: 4999,
        step: 50,
        value: 499,
        hint: 'What each guest pays.',
      },
      {
        name: 'spots',
        label: 'Total spots',
        prefix: '',
        min: 2,
        max: 60,
        step: 1,
        value: 12,
        hint: 'Including your own seat, which is free.',
      },
      {
        name: 'venue',
        label: 'Venue charge',
        prefix: '₹',
        min: 0,
        max: 30000,
        step: 500,
        value: 3000,
        hint: 'What the venue bills for the slot. Zero if you host somewhere free.',
      },
    ],
  },
  /**
   * Product screens showing what earning looks like inside Duncit. EMPTY until
   * real screenshots exist: this section renders nothing rather than dressing
   * stock photography up as the product. Paste the image URLs (ImageKit or the
   * app's store listing shots) as { image, alt, title, text } and it appears.
   */
  screenshots: {
    eyebrow: 'Inside Duncit',
    heading: 'What earning looks like',
    text: 'Your bookings, your payouts and what each pod made — the screens you will actually live in.',
    items: [] as { image: string; alt: string; title: string; text: string }[],
  },
  newsletter: {
    heading: 'Earning tips, once a month',
    text: 'What is working for hosts, venues and clubs on Duncit — no more than one email a month.',
    placeholder: 'you@example.com',
    button: 'Subscribe',
    /** Where the subscription came from, for the CRM's own reporting. */
    source: 'WEBSITE_FOOTER',
  },
  platform: {
    heading: "India's Community Earning Platform",
    text: 'Duncit helps people, venues, clubs and brands come together and grow together.',
    button: { label: 'Join Duncit Today', href: `${mwebUrl}/earn` },
    image: photo('34766307', 900),
    imageAlt: 'Friends looking at the Duncit app together',
  },
  footer: {
    tagline: 'Building communities. Creating opportunities. Earning together.',
    /** Rendered when the Website portal has no FOOTER navigation for this site;
     * the portal's groups win whenever they exist. */
    groups: [
      {
        label: 'Product',
        links: [
          { label: 'Earn With Us', href: '#paths' },
          { label: 'How It Works', href: '#how' },
          { label: 'Resources', href: `${mainSiteUrl}/safety/resources` },
          { label: 'Blog', href: `${mainSiteUrl}/blog` },
        ],
      },
      {
        label: 'Community',
        links: [
          { label: 'For Hosts', href: `${mwebUrl}/survey/host` },
          { label: 'For Venues', href: `${mwebUrl}/survey/venue` },
          { label: 'For Clubs', href: `${mwebUrl}/survey/club_admin` },
          { label: 'For Brands', href: `${mwebUrl}/survey/ecomm` },
        ],
      },
      {
        label: 'Support',
        links: [
          { label: 'Help Center', href: `${mainSiteUrl}/help` },
          { label: 'Contact Us', href: `${mainSiteUrl}/contact` },
          { label: 'Safety', href: `${mainSiteUrl}/safety/approach` },
          { label: 'Guidelines', href: `${mainSiteUrl}/guidelines` },
        ],
      },
      {
        label: 'Company',
        links: [
          { label: 'About Us', href: `${mainSiteUrl}/about` },
          { label: 'Careers', href: `${mainSiteUrl}/careers` },
          { label: 'Press Kit', href: `${mainSiteUrl}/newsroom` },
        ],
      },
    ],
  },
};
