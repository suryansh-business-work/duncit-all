// Single source of truth for the Duncit Ads marketing site. Content lives here
// as reusable configuration (not business data), and the portal URL is resolved
// from the environment so deployments stay dynamic without a code change.
// `astro dev` is local by definition — a dev server targets the local API
// without anyone remembering a flag. PUBLIC_IS_DEVELOPMENT still forces the
// dev targets for a built preview.
const isDevelopment = import.meta.env.DEV || import.meta.env.PUBLIC_IS_DEVELOPMENT === 'true';

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
  portalUrl,
  graphqlUrl,
  mainSiteUrl,
  brand: {
    name: 'Duncit Ads',
    title: 'Duncit Ads — advertise where your audience actually shows up',
    description:
      'Put your brand in front of people who came out to do something. Pick your placements, pick your days, see the price before you sign in.',
  },
  nav: {
    links: [
      { label: 'Placements', href: '#placements' },
      { label: 'Pricing', href: '#calculator' },
      { label: 'We design your ads', href: '#design' },
      { label: 'How it works', href: '#how' },
      { label: 'Why Duncit', href: '#why' },
    ],
    login: { label: 'Sign in', href: portalUrl },
    signup: { label: 'Start advertising', href: portalUrl },
  },
  hero: {
    eyebrow: 'Duncit Ads',
    heading: 'Reach the crowd that already showed up.',
    subheading:
      'Duncit is where people book the evening they are actually going to. Put your brand in that moment — on the home feed, in stories, beside the pod they just joined.',
    primaryCta: { label: 'Start advertising', href: portalUrl },
    secondaryCta: { label: 'See what it costs', href: '#calculator' },
    image: 'https://images.pexels.com/photos/6406691/pexels-photo-6406691.jpeg?auto=compress&cs=tinysrgb&w=1600',
    imageAlt: 'A brand team planning a campaign',
  },
  /** Numbers that describe the network, not any one campaign. */
  proof: [
    { value: '9', label: 'placements', hint: 'From the home feed to pod detail pages.' },
    { value: '30', label: 'days max', hint: 'Book a day or a month — you choose.' },
    { value: '24h', label: 'to go live', hint: 'Once Marketing approves your creative.' },
  ],
  features: [
    { icon: 'fa-bullhorn', title: 'Campaigns', text: 'Create, schedule and manage ad campaigns across every placement.' },
    { icon: 'fa-image', title: 'Creatives', text: 'Upload image or video creatives and swap them without re-booking.' },
    { icon: 'fa-chart-line', title: 'Performance', text: 'Track impressions, clicks and spend while the campaign is running.' },
    { icon: 'fa-users', title: 'Audiences', text: 'Target the placement your audience is already looking at.' },
  ] as Feature[],
  placements: {
    eyebrow: 'Where your ad lives',
    heading: 'Nine places to be seen',
    text: 'Every placement is priced per day and bookable on its own. The prices below are the live rate card — the same one the Ads console quotes.',
    /** Copy for the placements the rate card returns. A placement with no note
     * still renders — the server owns the list, this only enriches it. */
    notes: {
      AUTO: 'Rotates through every placement below.',
      HOME_BOTTOM: 'The feed everyone opens the app on.',
      SIDEBAR: 'Alongside browsing, on every screen.',
      EXPLORE_SCROLL: 'In the scroll where people are looking for something to do.',
      STATUS: 'Full-screen, between the stories people are already watching.',
      VENUE_LIST: 'While they are choosing where to go.',
      CLUB_LIST: 'While they are choosing who to go with.',
      POD_LIST: 'While they are choosing what to do.',
      POD_DETAILS: 'On the page where they decide to book.',
    } as Record<string, string>,
  },
  /** Creative services. The most common reason a small brand never books an ad
   * is that it has nothing to run — so this answers that before the price does. */
  design: {
    eyebrow: 'No creative? No problem',
    heading: 'We design your ads',
    text: 'Send us your logo, a photo and what you want to say. Our team builds the creative to the exact size each placement needs — image or video — and you approve it before anything goes live.',
    image:
      'https://images.pexels.com/photos/36731439/pexels-photo-36731439.jpeg?auto=compress&cs=tinysrgb&w=1200',
    imageAlt: 'A designer working on an ad creative',
    items: [
      { icon: 'fa-pen-ruler', title: 'Built to the placement', text: 'Every slot has its own size and safe area. We cut for the ones you booked.' },
      { icon: 'fa-photo-film', title: 'Image or video', text: 'A still for the feed, a short vertical for stories — whatever the placement takes.' },
      { icon: 'fa-wand-magic-sparkles', title: 'Two rounds of changes', text: 'You see it before it runs, and you say what to change.' },
      { icon: 'fa-rotate', title: 'Swap it mid-campaign', text: 'A new creative on a running campaign, without re-booking the slot.' },
    ],
    cta: { label: 'Ask for a creative', href: portalUrl },
    /** Priced by the Marketing team per brief, so the page does not invent one. */
    note: 'Design is quoted separately with your campaign — tell us what you need when you submit it.',
  },
  calculator: {
    eyebrow: 'What it costs',
    heading: 'Price your campaign before you sign up',
    text: 'Tick the placements you want and choose how long to run. These are live rates from Duncit — not a brochure figure.',
    placementsLabel: 'Placements',
    placementsHint: 'Pick as many as you like. Each one is booked and billed on its own.',
    daysLabel: 'How many days',
    daysHint: 'The same window applies to every placement you picked.',
    totalLabel: 'Campaign total',
    perDaySuffix: '/day',
    emptyNote: 'Pick at least one placement to see a price.',
    note: 'Live rates, straight from Duncit. The final cost is confirmed when Marketing approves your creative.',
    failedNote:
      'The rate card could not be loaded right now. The prices come from Duncit itself, so nothing is shown rather than a guess — please try again shortly.',
    disclaimer:
      'This is an estimate at today’s published rates. Rates can change, and the cost is frozen at the figure quoted when your campaign is approved.',
    cta: { label: 'Book this campaign', href: portalUrl },
  },
  steps: [
    { icon: 'fa-user-plus', title: 'Create an account', text: 'Sign in to the Ads console — no sales call, no minimum spend.' },
    { icon: 'fa-rectangle-ad', title: 'Upload your creative', text: 'An image or a video, a headline, and where the tap should go.' },
    { icon: 'fa-calendar-check', title: 'Pick placement and dates', text: 'The console quotes the same price you saw here.' },
    { icon: 'fa-rocket', title: 'Go live', text: 'Marketing reviews it, and your ad starts on the day you chose.' },
  ] as Step[],
  why: {
    heading: 'Why advertise on Duncit',
    text: 'Not another feed of strangers scrolling. People on Duncit are deciding what to do this weekend — and paying for it.',
    items: [
      { icon: 'fa-location-dot', label: 'An audience with intent, not just impressions' },
      { icon: 'fa-indian-rupee-sign', label: 'Per-day pricing with no minimum spend' },
      { icon: 'fa-sliders', label: 'Nine placements, bookable one at a time' },
      { icon: 'fa-clock', label: 'Live within a day of approval' },
      { icon: 'fa-chart-simple', label: 'Impressions and clicks while it runs' },
      { icon: 'fa-ban', label: 'Stop a campaign early, whenever you want' },
    ] as WhyItem[],
  },
  cta: {
    heading: 'Ready to launch your first campaign?',
    text: 'Sign in to the Ads console and go live in minutes.',
    button: { label: 'Get started', href: portalUrl },
  },
  newsletter: {
    heading: 'What is working on Duncit',
    text: 'Which placements are performing, and what advertisers are doing with them.',
    placeholder: 'you@example.com',
    button: 'Subscribe',
    /** Consent is taken before the address is sent, not assumed from typing
     * one in — and it names what is being agreed to. */
    consent: 'I agree to receive emails from Duncit and accept the',
    consentLinkLabel: 'privacy policy',
    /** Where the subscription came from, for the CRM's own reporting. */
    source: 'ADS_WEBSITE_FOOTER',
  },
  footer: {
    tagline: 'Advertising for the Duncit network.',
    /** Font Awesome brand marks; every one leaves the site, so SmartLink gives
     * them the new tab and the accessible name. */
    social: [
      { icon: 'fa-instagram', label: 'Instagram', href: 'https://www.instagram.com/duncit_app/' },
      { icon: 'fa-linkedin-in', label: 'LinkedIn', href: 'https://linkedin.com/company/duncit' },
      { icon: 'fa-facebook-f', label: 'Facebook', href: 'https://facebook.com/duncitapp' },
    ],
    /** Rendered when the Website portal has no FOOTER navigation for this site;
     * the portal's groups win whenever they exist. */
    groups: [
      {
        label: 'Advertise',
        links: [
          { label: 'Placements', href: '#placements' },
          { label: 'Pricing', href: '#calculator' },
          { label: 'We design your ads', href: '#design' },
          { label: 'How it works', href: '#how' },
          { label: 'Ads console', href: portalUrl },
        ],
      },
      {
        label: 'Duncit',
        links: [
          { label: 'Duncit', href: mainSiteUrl },
          { label: 'Earn with Duncit', href: `${mainSiteUrl}/earn` },
          { label: 'Support', href: `${mainSiteUrl}/help` },
        ],
      },
    ],
  },
};
