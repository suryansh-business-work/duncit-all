// Single source of truth for the "Earn with Duncit" marketing site. The URLs
// are resolved from the environment so deployments stay dynamic without a code
// change; the WORDS come from Admin > Localization, like every other surface
// (rule 38) — see `siteContent` below.
//
// `astro dev` is local by definition, so a dev server targets the local API
// without anyone remembering a flag — running the site locally against the
// production server is how a missing local change looks like a broken page.
// PUBLIC_IS_DEVELOPMENT still forces the dev targets for a built preview.
import { getSiteTranslator, type SiteTranslate } from '@duncit/brand/site-i18n';

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

/**
 * Everything that is NOT copy: the environment, and where each link goes.
 *
 * A separate synchronous export because the client-side `<script>` in
 * Layout.astro needs the API URL. A browser bundle cannot await the build-time
 * catalogue, and it has no business carrying the site's prose either.
 */
export const siteUrls = { isDevelopment, mwebUrl, graphqlUrl, mainSiteUrl };

const build = (t: SiteTranslate) => ({
  ...siteUrls,
  brand: {
    name: t('website.earn.brand.name'),
    title: t('website.earn.brand.title'),
    description: t('website.earn.brand.description'),
  },
  nav: {
    // On-page anchors for what this site itself answers; the rest live on the
    // main site, so the header links across instead of duplicating them.
    links: [
      { label: t('website.earn.nav.aboutUs'), href: `${mainSiteUrl}/about` },
      { label: t('website.earn.nav.howItWorks'), href: '#how' },
      { label: t('website.earn.nav.earnWithDuncit'), href: '#paths' },
      { label: t('website.earn.nav.resources'), href: `${mainSiteUrl}/safety/resources` },
      { label: t('website.earn.nav.blog'), href: `${mainSiteUrl}/blog` },
    ],
    login: { label: t('website.earn.nav.login'), href: `${mwebUrl}/login` },
    signup: { label: t('website.earn.nav.signup'), href: `${mwebUrl}/register` },
  },
  hero: {
    eyebrow: t('website.earn.hero.eyebrow'),
    heading: t('website.earn.hero.heading'),
    paragraphs: [t('website.earn.hero.paragraph1'), t('website.earn.hero.paragraph2')],
    primaryCta: { label: t('website.earn.hero.primaryCta'), href: `${mwebUrl}/earn` },
    secondaryCta: { label: t('website.earn.hero.secondaryCta'), href: '#paths' },
    // Full-bleed banner behind the header, so it is requested at a width that
    // survives a desktop viewport.
    image: photo('34766307', 1920),
    imageAlt: t('website.earn.hero.imageAlt'),
    /** Rides the 3D band under the banner, scrolling past on a loop. */
    ribbon: [
      t('website.earn.hero.ribbon1'),
      t('website.earn.hero.ribbon2'),
      t('website.earn.hero.ribbon3'),
      t('website.earn.hero.ribbon4'),
      t('website.earn.hero.ribbon5'),
    ],
  },
  // The same four journeys the app offers, each deep-linking into its survey
  // gate — the site and the Earn screen must not drift apart.
  pathsSection: {
    eyebrow: t('website.earn.paths.sectionEyebrow'),
    headingLead: t('website.earn.paths.sectionHeadingLead'),
    headingAccent: t('website.earn.paths.sectionHeadingAccent'),
  },
  paths: [
    {
      icon: 'fa-building',
      title: t('website.earn.paths.venueTitle'),
      text: t('website.earn.paths.venueText'),
      image: photo('2813132', 800),
      imageAlt: t('website.earn.paths.venueImageAlt'),
      href: `${mwebUrl}/survey/venue`,
      cta: t('website.earn.paths.venueCta'),
    },
    {
      icon: 'fa-user',
      title: t('website.earn.paths.hostTitle'),
      text: t('website.earn.paths.hostText'),
      image: photo('34766307', 800),
      imageAlt: t('website.earn.paths.hostImageAlt'),
      href: `${mwebUrl}/survey/host`,
      cta: t('website.earn.paths.hostCta'),
    },
    {
      icon: 'fa-people-group',
      title: t('website.earn.paths.clubTitle'),
      text: t('website.earn.paths.clubText'),
      image: photo('8111879', 800),
      imageAlt: t('website.earn.paths.clubImageAlt'),
      href: `${mwebUrl}/survey/club_admin`,
      cta: t('website.earn.paths.clubCta'),
    },
    {
      icon: 'fa-tag',
      title: t('website.earn.paths.brandTitle'),
      text: t('website.earn.paths.brandText'),
      image: photo('13013767', 800),
      imageAlt: t('website.earn.paths.brandImageAlt'),
      href: `${mwebUrl}/survey/ecomm`,
      cta: t('website.earn.paths.brandCta'),
    },
  ] as EarnPath[],
  why: {
    eyebrow: t('website.earn.why.eyebrow'),
    items: [
      { icon: 'fa-gift', label: t('website.earn.why.item1') },
      { icon: 'fa-wallet', label: t('website.earn.why.item2') },
      { icon: 'fa-shield-halved', label: t('website.earn.why.item3') },
      { icon: 'fa-wand-magic-sparkles', label: t('website.earn.why.item4') },
      { icon: 'fa-bullhorn', label: t('website.earn.why.item5') },
    ] as WhyItem[],
  },
  steps: {
    eyebrow: t('website.earn.steps.eyebrow'),
    heading: t('website.earn.steps.heading'),
    items: [
      {
        icon: 'fa-user-plus',
        title: t('website.earn.steps.registerTitle'),
        text: t('website.earn.steps.registerText'),
      },
      {
        icon: 'fa-address-card',
        title: t('website.earn.steps.verificationTitle'),
        text: t('website.earn.steps.verificationText'),
      },
      {
        icon: 'fa-shield-halved',
        title: t('website.earn.steps.approvedTitle'),
        text: t('website.earn.steps.approvedText'),
      },
      {
        icon: 'fa-calendar-check',
        title: t('website.earn.steps.bookingsTitle'),
        text: t('website.earn.steps.bookingsText'),
      },
      {
        icon: 'fa-wallet',
        title: t('website.earn.steps.earnTitle'),
        text: t('website.earn.steps.earnText'),
      },
    ] as Step[],
  },
  // The estimator's inputs. The RATES are not here on purpose — GST, the
  // platform fee and the rest come from the server's settlement waterfall, so
  // this page cannot state a percentage the platform no longer charges.
  calculator: {
    eyebrow: t('website.earn.calculator.eyebrow'),
    heading: t('website.earn.calculator.heading'),
    text: t('website.earn.calculator.text'),
    currency: '₹',
    rolesAriaLabel: t('website.earn.calculator.rolesAriaLabel'),
    // Every money line is a month's worth, like the take-home — only the row
    // that says "per pod" is not.
    rowLabels: {
      gross: t('website.earn.calculator.rowGross'),
      gst: t('website.earn.calculator.rowGst'),
      platform: t('website.earn.calculator.rowPlatform'),
      venue: t('website.earn.calculator.rowVenue'),
      clubAdmin: t('website.earn.calculator.rowClubAdmin'),
      hostCommission: t('website.earn.calculator.rowHostCommission'),
      perPod: t('website.earn.calculator.rowPerPod'),
      pods: t('website.earn.calculator.rowPods'),
    },
    /**
     * The two people a pod pays. Both read the SAME waterfall the server
     * returns — `field` picks which line of it is that role's money, so the two
     * tabs can never disagree about the same pod.
     */
    roles: [
      {
        key: 'host',
        label: t('website.earn.calculator.hostLabel'),
        name: t('website.earn.calculator.hostName'),
        field: 'host_receives',
        takeHomeLabel: t('website.earn.calculator.hostTakeHome'),
        // A host earns per pod too, so the month is the pod's payout times how
        // many they run.
        multiplier: 'pods',
        // Deductions shown above the take-home, in the order money leaves,
        // then the per-pod payout and the count it multiplies by.
        // Every deduction the pod's money passes through, so the column
        // actually adds up to the take-home rather than nearly.
        rows: ['gross', 'gst', 'platform', 'venue', 'clubAdmin', 'hostCommission', 'perPod', 'pods'],
        dutiesTitle: t('website.earn.calculator.hostDutiesTitle'),
        duties: [
          t('website.earn.calculator.hostDuty1'),
          t('website.earn.calculator.hostDuty2'),
          t('website.earn.calculator.hostDuty3'),
          t('website.earn.calculator.hostDuty4'),
        ],
      },
      {
        key: 'club_admin',
        label: t('website.earn.calculator.clubAdminLabel'),
        name: t('website.earn.calculator.clubAdminName'),
        field: 'club_admin_amount',
        takeHomeLabel: t('website.earn.calculator.clubAdminTakeHome'),
        /** The share this role is paid on. Zero means the platform has not set
         * one — the panel says that instead of showing ₹0 as if it were news. */
        rateField: 'club_admin_pct',
        // The club admin's money is per pod and then multiplied by how many
        // pods the club runs — the rows show that sum being made.
        multiplier: 'pods',
        rows: ['gross', 'gst', 'platform', 'perPod', 'pods'],
        dutiesTitle: t('website.earn.calculator.clubAdminDutiesTitle'),
        duties: [
          t('website.earn.calculator.clubAdminDuty1'),
          t('website.earn.calculator.clubAdminDuty2'),
          t('website.earn.calculator.clubAdminDuty3'),
        ],
      },
    ],
    note: t('website.earn.calculator.note'),
    /** The downloadable copy of an estimate — a real PDF the visitor keeps, drawn
     * page-first rather than handed to the browser's print dialog. The library
     * that draws it is fetched on the first click, so the page costs nothing to
     * load for everyone who never asks for one. */
    pdf: {
      button: t('website.earn.calculator.pdfButton'),
      preparing: t('website.earn.calculator.pdfPreparing'),
      error: t('website.earn.calculator.pdfError'),
      fileName: 'duncit-earnings-estimate.pdf',
      title: t('website.earn.calculator.pdfTitle'),
      inputsTitle: t('website.earn.calculator.pdfInputsTitle'),
      breakdownTitle: t('website.earn.calculator.pdfBreakdownTitle'),
      footer: t('website.earn.calculator.pdfFooter'),
    },
    /** Shown instead of a confident figure when the pod cannot pay this role. */
    shortfallNote: t('website.earn.calculator.shortfallNote'),
    /** A club admin is paid a share Duncit sets; at 0% there is nothing to
     * estimate, and a cheerful ₹0 would be worse than saying so. */
    noShareNote: t('website.earn.calculator.noShareNote'),
    disclaimer: t('website.earn.calculator.disclaimer'),
    fields: [
      {
        name: 'ticket',
        label: t('website.earn.calculator.ticketLabel'),
        prefix: '₹',
        min: 99,
        max: 4999,
        step: 50,
        value: 499,
        hint: t('website.earn.calculator.ticketHint'),
      },
      {
        name: 'spots',
        label: t('website.earn.calculator.spotsLabel'),
        prefix: '',
        min: 2,
        max: 60,
        step: 1,
        value: 12,
        hint: t('website.earn.calculator.spotsHint'),
      },
      {
        name: 'venue',
        label: t('website.earn.calculator.venueLabel'),
        prefix: '₹',
        min: 500,
        max: 30000,
        step: 500,
        value: 500,
        hint: t('website.earn.calculator.venueHint'),
      },
      {
        name: 'pods',
        label: t('website.earn.calculator.podsLabel'),
        prefix: '',
        min: 1,
        max: 60,
        step: 1,
        value: 8,
        hint: t('website.earn.calculator.podsHint'),
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
    eyebrow: t('website.earn.screenshots.eyebrow'),
    heading: t('website.earn.screenshots.heading'),
    text: t('website.earn.screenshots.text'),
    items: [] as { image: string; alt: string; title: string; text: string }[],
  },
  newsletter: {
    heading: t('website.earn.newsletter.heading'),
    text: t('website.earn.newsletter.text'),
    placeholder: t('website.earn.newsletter.placeholder'),
    button: t('website.earn.newsletter.button'),
    /** Consent is taken before the address is sent, not assumed from typing
     * one in — and it names what is being agreed to. */
    consent: t('website.earn.newsletter.consent'),
    consentLinkLabel: t('website.earn.newsletter.consentLinkLabel'),
    /** Where the subscription came from, for the CRM's own reporting. */
    source: 'WEBSITE_FOOTER',
  },
  platform: {
    // One sentence in three parts, because the middle word is coloured and the
    // tail sits on its own line.
    headingLead: t('website.earn.platform.headingLead'),
    headingAccent: t('website.earn.platform.headingAccent'),
    headingTail: t('website.earn.platform.headingTail'),
    text: t('website.earn.platform.text'),
    button: { label: t('website.earn.platform.button'), href: `${mwebUrl}/earn` },
    image: photo('34766307', 900),
    imageAlt: t('website.earn.platform.imageAlt'),
  },
  /** The shared @duncit/brand download band. The store URLs come from branding,
   * so only the words are here. */
  download: {
    heading: t('website.earn.download.heading'),
    headingAccent: t('website.earn.download.headingAccent'),
    text: t('website.earn.download.text'),
    googlePlayEyebrow: t('website.earn.download.googlePlayEyebrow'),
    googlePlayName: t('website.earn.download.googlePlayName'),
    appStoreEyebrow: t('website.earn.download.appStoreEyebrow'),
    appStoreName: t('website.earn.download.appStoreName'),
    perks: [
      t('website.earn.download.perk1'),
      t('website.earn.download.perk2'),
      t('website.earn.download.perk3'),
    ],
  },
  notFound: {
    title: t('website.earn.notFound.title'),
    heading: t('website.earn.notFound.heading'),
    text: t('website.earn.notFound.text'),
    cta: t('website.earn.notFound.cta'),
  },
  footer: {
    tagline: t('website.earn.footer.tagline'),
    rights: t('website.earn.footer.rights'),
    builtFor: t('website.earn.footer.builtFor'),
    /** Font Awesome brand marks; every one leaves the site, so SmartLink gives
     * them the new tab and the accessible name. The account names are proper
     * nouns and stay as they are — a translator has nothing to do with them. */
    social: [
      { icon: 'fa-instagram', label: 'Instagram', href: 'https://www.instagram.com/duncit_app/' },
      { icon: 'fa-linkedin-in', label: 'LinkedIn', href: 'https://linkedin.com/company/duncit' },
      { icon: 'fa-facebook-f', label: 'Facebook', href: 'https://facebook.com/duncitapp' },
    ],
    /** Rendered when the Website portal has no FOOTER navigation for this site;
     * the portal's groups win whenever they exist. */
    groups: [
      {
        label: t('website.earn.footer.groupProduct'),
        links: [
          { label: t('website.earn.footer.earnWithUs'), href: '#paths' },
          { label: t('website.earn.footer.howItWorks'), href: '#how' },
          { label: t('website.earn.footer.earningsEstimator'), href: '#calculator' },
          { label: t('website.earn.footer.resources'), href: `${mainSiteUrl}/safety/resources` },
          { label: t('website.earn.footer.blog'), href: `${mainSiteUrl}/blog` },
        ],
      },
      {
        label: t('website.earn.footer.groupCommunity'),
        links: [
          { label: t('website.earn.footer.forHosts'), href: `${mwebUrl}/survey/host` },
          { label: t('website.earn.footer.forVenues'), href: `${mwebUrl}/survey/venue` },
          { label: t('website.earn.footer.forClubs'), href: `${mwebUrl}/survey/club_admin` },
          { label: t('website.earn.footer.forBrands'), href: `${mwebUrl}/survey/ecomm` },
          { label: t('website.earn.footer.community'), href: `${mainSiteUrl}/community` },
        ],
      },
      {
        label: t('website.earn.footer.groupSupport'),
        links: [
          { label: t('website.earn.footer.helpCenter'), href: `${mainSiteUrl}/help` },
          { label: t('website.earn.footer.contactUs'), href: `${mainSiteUrl}/contact` },
          { label: t('website.earn.footer.faq'), href: `${mainSiteUrl}/faq` },
          { label: t('website.earn.footer.safety'), href: `${mainSiteUrl}/safety/approach` },
          { label: t('website.earn.footer.guidelines'), href: `${mainSiteUrl}/guidelines` },
        ],
      },
      {
        label: t('website.earn.footer.groupCompany'),
        links: [
          { label: t('website.earn.footer.aboutUs'), href: `${mainSiteUrl}/about` },
          { label: t('website.earn.footer.careers'), href: `${mainSiteUrl}/careers` },
          { label: t('website.earn.footer.newsroom'), href: `${mainSiteUrl}/newsroom` },
          { label: t('website.earn.footer.login'), href: `${mwebUrl}/login` },
          { label: t('website.earn.footer.signup'), href: `${mwebUrl}/register` },
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
