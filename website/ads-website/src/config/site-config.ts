// Single source of truth for the Duncit Ads marketing site. The URLs are
// resolved from the environment so deployments stay dynamic without a code
// change; the WORDS come from Admin > Localization, like every other surface
// (rule 38) — see `siteContent` below.
//
// `astro dev` is local by definition — a dev server targets the local API
// without anyone remembering a flag. PUBLIC_IS_DEVELOPMENT still forces the
// dev targets for a built preview.
import { getSiteTranslator, type SiteTranslate } from '@duncit/brand/site-i18n';

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

/** Everything that is not copy: the environment, and where each link goes. */
export const siteUrls = { isDevelopment, portalUrl, graphqlUrl, mainSiteUrl };

const build = (t: SiteTranslate) => ({
  ...siteUrls,
  brand: {
    name: t('website.ads.brand.name'),
    title: t('website.ads.brand.title'),
    description: t('website.ads.brand.description'),
  },
  nav: {
    links: [
      { label: t('website.ads.nav.placements'), href: '#placements' },
      { label: t('website.ads.nav.pricing'), href: '#calculator' },
      { label: t('website.ads.nav.design'), href: '#design' },
      { label: t('website.ads.nav.how'), href: '#how' },
      { label: t('website.ads.nav.why'), href: '#why' },
    ],
    login: { label: t('website.ads.nav.login'), href: portalUrl },
    signup: { label: t('website.ads.nav.signup'), href: portalUrl },
  },
  hero: {
    eyebrow: t('website.ads.hero.eyebrow'),
    heading: t('website.ads.hero.heading'),
    subheading: t('website.ads.hero.subheading'),
    primaryCta: { label: t('website.ads.hero.primaryCta'), href: portalUrl },
    secondaryCta: { label: t('website.ads.hero.secondaryCta'), href: '#calculator' },
    image:
      'https://images.pexels.com/photos/6406691/pexels-photo-6406691.jpeg?auto=compress&cs=tinysrgb&w=1600',
    imageAlt: t('website.ads.hero.imageAlt'),
  },
  /** Numbers that describe the network, not any one campaign. */
  proof: [
    {
      value: '9',
      label: t('website.ads.proof.placementsLabel'),
      hint: t('website.ads.proof.placementsHint'),
    },
    { value: '30', label: t('website.ads.proof.daysLabel'), hint: t('website.ads.proof.daysHint') },
    { value: '24h', label: t('website.ads.proof.liveLabel'), hint: t('website.ads.proof.liveHint') },
  ],
  featuresSection: {
    heading: t('website.ads.features.heading'),
    text: t('website.ads.features.text'),
  },
  features: [
    {
      icon: 'fa-bullhorn',
      title: t('website.ads.features.campaignsTitle'),
      text: t('website.ads.features.campaignsText'),
    },
    {
      icon: 'fa-image',
      title: t('website.ads.features.creativesTitle'),
      text: t('website.ads.features.creativesText'),
    },
    {
      icon: 'fa-chart-line',
      title: t('website.ads.features.performanceTitle'),
      text: t('website.ads.features.performanceText'),
    },
    {
      icon: 'fa-users',
      title: t('website.ads.features.audiencesTitle'),
      text: t('website.ads.features.audiencesText'),
    },
  ] as Feature[],
  placements: {
    eyebrow: t('website.ads.placements.eyebrow'),
    heading: t('website.ads.placements.heading'),
    text: t('website.ads.placements.text'),
    rateCardCaption: t('website.ads.placements.rateCardCaption'),
    /** Copy for the placements the rate card returns. A placement with no note
     * still renders — the server owns the list, this only enriches it. */
    notes: {
      AUTO: t('website.ads.placements.auto'),
      HOME_BOTTOM: t('website.ads.placements.homeBottom'),
      SIDEBAR: t('website.ads.placements.sidebar'),
      EXPLORE_SCROLL: t('website.ads.placements.exploreScroll'),
      STATUS: t('website.ads.placements.status'),
      VENUE_LIST: t('website.ads.placements.venueList'),
      CLUB_LIST: t('website.ads.placements.clubList'),
      POD_LIST: t('website.ads.placements.podList'),
      POD_DETAILS: t('website.ads.placements.podDetails'),
    } as Record<string, string>,
  },
  /** The phone mock beside the rate card, labelled zone by zone. */
  preview: {
    STATUS: t('website.ads.preview.stories'),
    EXPLORE_SCROLL: t('website.ads.preview.exploreScroll'),
    POD_LIST: t('website.ads.preview.podListings'),
    VENUE_LIST: t('website.ads.preview.venueListings'),
    CLUB_LIST: t('website.ads.preview.clubListings'),
    POD_DETAILS: t('website.ads.preview.podDetails'),
    SIDEBAR: t('website.ads.preview.sidebar'),
    HOME_BOTTOM: t('website.ads.preview.homeFeed'),
    caption: t('website.ads.preview.caption'),
  } as Record<string, string>,
  /** Creative services. The most common reason a small brand never books an ad
   * is that it has nothing to run — so this answers that before the price does. */
  design: {
    eyebrow: t('website.ads.design.eyebrow'),
    heading: t('website.ads.design.heading'),
    text: t('website.ads.design.text'),
    image:
      'https://images.pexels.com/photos/36731439/pexels-photo-36731439.jpeg?auto=compress&cs=tinysrgb&w=1200',
    imageAlt: t('website.ads.design.imageAlt'),
    items: [
      {
        icon: 'fa-pen-ruler',
        title: t('website.ads.design.builtTitle'),
        text: t('website.ads.design.builtText'),
      },
      {
        icon: 'fa-photo-film',
        title: t('website.ads.design.formatTitle'),
        text: t('website.ads.design.formatText'),
      },
      {
        icon: 'fa-wand-magic-sparkles',
        title: t('website.ads.design.roundsTitle'),
        text: t('website.ads.design.roundsText'),
      },
      {
        icon: 'fa-rotate',
        title: t('website.ads.design.swapTitle'),
        text: t('website.ads.design.swapText'),
      },
    ],
    cta: { label: t('website.ads.design.cta'), href: portalUrl },
    /** Priced by the Marketing team per brief, so the page does not invent one. */
    note: t('website.ads.design.note'),
  },
  calculator: {
    eyebrow: t('website.ads.calculator.eyebrow'),
    heading: t('website.ads.calculator.heading'),
    text: t('website.ads.calculator.text'),
    placementsLabel: t('website.ads.calculator.placementsLabel'),
    placementsHint: t('website.ads.calculator.placementsHint'),
    daysLabel: t('website.ads.calculator.daysLabel'),
    daysHint: t('website.ads.calculator.daysHint'),
    totalLabel: t('website.ads.calculator.totalLabel'),
    perDaySuffix: t('website.ads.calculator.perDaySuffix'),
    emptyNote: t('website.ads.calculator.emptyNote'),
    note: t('website.ads.calculator.note'),
    failedNote: t('website.ads.calculator.failedNote'),
    disclaimer: t('website.ads.calculator.disclaimer'),
    cta: { label: t('website.ads.calculator.cta'), href: portalUrl },
  },
  stepsSection: {
    eyebrow: t('website.ads.steps.eyebrow'),
    heading: t('website.ads.steps.heading'),
  },
  steps: [
    {
      icon: 'fa-user-plus',
      title: t('website.ads.steps.accountTitle'),
      text: t('website.ads.steps.accountText'),
    },
    {
      icon: 'fa-rectangle-ad',
      title: t('website.ads.steps.creativeTitle'),
      text: t('website.ads.steps.creativeText'),
    },
    {
      icon: 'fa-calendar-check',
      title: t('website.ads.steps.bookTitle'),
      text: t('website.ads.steps.bookText'),
    },
    { icon: 'fa-rocket', title: t('website.ads.steps.liveTitle'), text: t('website.ads.steps.liveText') },
  ] as Step[],
  why: {
    heading: t('website.ads.why.heading'),
    text: t('website.ads.why.text'),
    items: [
      { icon: 'fa-location-dot', label: t('website.ads.why.intent') },
      { icon: 'fa-indian-rupee-sign', label: t('website.ads.why.pricing') },
      { icon: 'fa-sliders', label: t('website.ads.why.placements') },
      { icon: 'fa-clock', label: t('website.ads.why.speed') },
      { icon: 'fa-chart-simple', label: t('website.ads.why.metrics') },
      { icon: 'fa-ban', label: t('website.ads.why.stop') },
    ] as WhyItem[],
  },
  cta: {
    heading: t('website.ads.cta.heading'),
    text: t('website.ads.cta.text'),
    button: { label: t('website.ads.cta.button'), href: portalUrl },
  },
  newsletter: {
    heading: t('website.ads.newsletter.heading'),
    text: t('website.ads.newsletter.text'),
    placeholder: t('website.brand.newsletter.placeholder'),
    button: t('website.brand.newsletter.button'),
    /** Consent is taken before the address is sent, not assumed from typing
     * one in — and it names what is being agreed to. */
    consent: t('website.ads.newsletter.consent'),
    consentLinkLabel: t('website.brand.newsletter.consentLink'),
    /** Where the subscription came from, for the CRM's own reporting. */
    source: 'ADS_WEBSITE_FOOTER',
  },
  notFound: {
    heading: t('website.ads.notFound.heading'),
    text: t('website.ads.notFound.text'),
  },
  download: {
    heading: t('website.ads.download.heading'),
    headingAccent: t('website.ads.download.headingAccent'),
    text: t('website.ads.download.text'),
    perks: [
      t('website.ads.download.perkPlacements'),
      t('website.ads.download.perkSpeed'),
      t('website.ads.download.perkMetrics'),
    ],
    googlePlayEyebrow: t('website.ads.download.googlePlayEyebrow'),
    googlePlayName: t('website.ads.download.googlePlayName'),
    appStoreEyebrow: t('website.ads.download.appStoreEyebrow'),
    appStoreName: t('website.ads.download.appStoreName'),
  },
  header: {
    wordmarkAds: t('website.ads.header.wordmarkAds'),
    themeToggle: t('website.ads.header.themeToggle'),
  },
  footer: {
    tagline: t('website.ads.footer.tagline'),
    note: t('website.ads.footer.note'),
    /** The copyright line. The year is a build-time value, like every other
     *  date on a static page. */
    rights: t('website.ads.footer.rights', { vars: { year: new Date().getFullYear() } }),
    /** Font Awesome brand marks; every one leaves the site, so SmartLink gives
     * them the new tab and the accessible name. A handle is a proper noun, so
     * none of these labels is a translation key. */
    social: [
      { icon: 'fa-instagram', label: 'Instagram', href: 'https://www.instagram.com/duncit_app/' },
      { icon: 'fa-linkedin-in', label: 'LinkedIn', href: 'https://linkedin.com/company/duncit' },
      { icon: 'fa-facebook-f', label: 'Facebook', href: 'https://facebook.com/duncitapp' },
    ],
    /** Rendered when the Website portal has no FOOTER navigation for this site;
     * the portal's groups win whenever they exist. */
    groups: [
      {
        label: t('website.ads.footer.advertiseGroup'),
        links: [
          { label: t('website.ads.nav.placements'), href: '#placements' },
          { label: t('website.ads.nav.pricing'), href: '#calculator' },
          { label: t('website.ads.nav.design'), href: '#design' },
          { label: t('website.ads.nav.how'), href: '#how' },
          { label: t('website.ads.footer.adsConsole'), href: portalUrl },
        ],
      },
      {
        label: t('website.ads.footer.duncitGroup'),
        links: [
          { label: t('website.ads.footer.duncit'), href: mainSiteUrl },
          { label: t('website.ads.footer.earnWithDuncit'), href: `${mainSiteUrl}/earn` },
          { label: t('website.ads.footer.support'), href: `${mainSiteUrl}/help` },
        ],
      },
    ],
  },
});

export type SiteContent = ReturnType<typeof build>;

/**
 * The site's content, in the visitor's language.
 *
 * Awaited in each component's frontmatter rather than threaded down as a prop:
 * Astro renders the whole page on the server, so a component can await the same
 * memoised promise the one above it did. The catalogue is therefore fetched
 * ONCE for the whole build, and a component's body reads exactly as it did when
 * this was a plain constant.
 */
let content: Promise<SiteContent> | null = null;

export function siteContent(): Promise<SiteContent> {
  content ??= getSiteTranslator(graphqlUrl).then(({ t }) => build(t));
  return content;
}
