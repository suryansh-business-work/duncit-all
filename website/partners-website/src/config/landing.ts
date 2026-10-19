import { getSiteTranslator, type SiteTranslate } from '@duncit/brand/site-i18n';
import { urlConfigs } from './url-configs';

/**
 * The partner site's content.
 *
 * The photographs and the layout live here; the WORDS come from Admin >
 * Localization like every other surface (rule 38), which is why this is a
 * function of the site's translator rather than a plain constant.
 */
const build = (t: SiteTranslate) => ({
  heroImage:
    'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=1800&q=85&auto=format&fit=crop',
  proofImage:
    'https://images.unsplash.com/photo-1542744095-fcf48d80b0fd?w=1200&q=85&auto=format&fit=crop',
  /** The partner paths. Each opens its own journey in the partner console. */
  pillars: [
    {
      tone: 'venue',
      icon: 'fa-store',
      tag: t('website.partners.ways.venueTag'),
      title: t('website.partners.ways.venueName'),
      text: t('website.partners.ways.venueBody'),
      cta: t('website.partners.ways.venueTitle'),
      href: `${urlConfigs.partnersAppUrl}/register-venue`,
    },
    {
      tone: 'club',
      icon: 'fa-people-group',
      tag: t('website.partners.ways.clubTag'),
      title: t('website.partners.ways.clubName'),
      text: t('website.partners.ways.clubBody'),
      cta: t('website.partners.ways.clubCta'),
      href: `${urlConfigs.partnersAppUrl}/earn`,
    },
    {
      tone: 'brand',
      icon: 'fa-bag-shopping',
      tag: t('website.partners.ways.brandTag'),
      title: t('website.partners.ways.brandName'),
      text: t('website.partners.ways.brandBody'),
      cta: t('website.partners.ways.brandCta'),
      href: `${urlConfigs.partnersAppUrl}/become-a-brand-partner`,
    },
    {
      tone: 'console',
      icon: 'fa-gauge-high',
      tag: t('website.partners.ways.consoleTag'),
      title: t('website.partners.ways.consoleName'),
      text: t('website.partners.ways.earningsText'),
      cta: t('website.partners.nav.login'),
      href: urlConfigs.partnersAppUrl,
    },
  ],
  steps: [
    {
      icon: 'fa-file-signature',
      title: t('website.partners.steps.applyTitle'),
      text: t('website.partners.steps.applyText'),
    },
    {
      icon: 'fa-shield-halved',
      title: t('website.partners.steps.verifyTitle'),
      text: t('website.partners.steps.verifyText'),
    },
    {
      icon: 'fa-gauge-high',
      title: t('website.partners.steps.runTitle'),
      text: t('website.partners.steps.runText'),
    },
    {
      icon: 'fa-wallet',
      title: t('website.partners.steps.payoutTitle'),
      text: t('website.partners.steps.payoutText'),
    },
  ],
  /** Cards that float over the hero photograph. */
  floats: [
    {
      icon: 'fa-calendar-check',
      title: t('website.partners.hero.floatRequestTitle'),
      text: t('website.partners.hero.floatRequestText'),
    },
    {
      icon: 'fa-shield-halved',
      title: t('website.partners.hero.floatVerifiedTitle'),
      text: t('website.partners.hero.floatVerifiedText'),
    },
    {
      icon: 'fa-wallet',
      title: t('website.partners.hero.floatPayoutTitle'),
      text: t('website.partners.hero.floatPayoutText'),
    },
  ],
  marquee: [
    { icon: 'fa-clock', label: t('website.partners.marquee.quietHours') },
    { icon: 'fa-user-group', label: t('website.partners.marquee.readyGroups') },
    { icon: 'fa-calendar-days', label: t('website.partners.marquee.clubEvents') },
    { icon: 'fa-chart-line', label: t('website.partners.marquee.growMembers') },
    { icon: 'fa-bag-shopping', label: t('website.partners.marquee.sellProducts') },
    { icon: 'fa-shield-halved', label: t('website.partners.marquee.verified') },
    { icon: 'fa-wallet', label: t('website.partners.marquee.payouts') },
    { icon: 'fa-gauge-high', label: t('website.partners.marquee.console') },
  ],
  /** The three marquee points repeated, readable, under the hero buttons. */
  proof: [
    { icon: 'fa-shield-halved', label: t('website.partners.marquee.verified') },
    { icon: 'fa-gauge-high', label: t('website.partners.marquee.console') },
    { icon: 'fa-wallet', label: t('website.partners.marquee.payouts') },
  ],
});

export type PartnerLanding = ReturnType<typeof build>;

/**
 * Awaited in each component's frontmatter rather than threaded down as a prop:
 * Astro renders the whole page on the server, so a component can await the same
 * memoised promise the one above it did — the catalogue is fetched ONCE for the
 * whole build.
 */
let content: Promise<PartnerLanding> | null = null;

export function partnerLanding(): Promise<PartnerLanding> {
  content ??= getSiteTranslator(urlConfigs.graphqlUrl).then(({ t }) => build(t));
  return content;
}
