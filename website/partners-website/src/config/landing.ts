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
  pillars: [
    {
      icon: 'fa-store',
      title: t('website.partners.ways.venueTitle'),
      text: t('website.partners.ways.venueText'),
    },
    {
      icon: 'fa-champagne-glasses',
      title: t('website.partners.ways.hostTitle'),
      text: t('website.partners.ways.hostText'),
    },
    {
      icon: 'fa-chart-line',
      title: t('website.partners.ways.earningsTitle'),
      text: t('website.partners.ways.earningsText'),
    },
  ],
  stats: [
    { value: '24h', label: t('website.partners.ways.statReview') },
    { value: '0', label: t('website.partners.ways.statFee') },
    { value: '2', label: t('website.partners.ways.statPaths') },
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
