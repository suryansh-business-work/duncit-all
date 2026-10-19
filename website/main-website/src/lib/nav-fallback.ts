import type { Translator } from '@duncit/i18n';
import type { SiteNavGroup, SiteNavLink } from './site-data';

type Translate = Translator['t'];

/** A fallback group may carry its own icon: its label is translated, so an
 * icon map keyed on display text would stop matching in another language. */
export type FallbackNavGroup = SiteNavGroup & { icon?: string };

const link = (id: string, label: string, url: string): SiteNavLink => ({
  id,
  label,
  url,
  area: 'HEADER',
  group_label: '',
  sort_order: 0,
});

/**
 * What the header (top bar + drawer) and footer render when the Website
 * portal's Navigation manager does not answer. One list for every piece of
 * chrome, so a page added later is added once. The portal's own groups win
 * whenever they exist (see `fetchNavGroups`).
 */
export function navFallback(t: Translate, supportEmail?: string): FallbackNavGroup[] {
  const support = [
    link('n-help', t('website.main.nav.helpCenter'), '/help'),
    link('n-faq', t('website.main.nav.faq'), '/faq'),
  ];
  if (supportEmail) support.push(link('n-support-mail', t('website.main.nav.emailSupport'), `mailto:${supportEmail}`));

  return [
    {
      label: t('website.main.nav.about'),
      icon: 'fa-circle-info',
      links: [
        link('n-about', t('website.main.nav.aboutUs'), '/about'),
        link('n-newsroom', t('website.main.nav.newsroom'), '/newsroom'),
        link('n-careers', t('website.main.nav.careers'), '/careers'),
        link('n-contact', t('website.main.nav.contactUs'), '/contact'),
      ],
    },
    {
      label: t('website.main.nav.community'),
      icon: 'fa-people-group',
      links: [
        link('n-community', t('website.main.nav.community'), '/community'),
        link('n-guidelines', t('website.main.nav.guidelines'), '/guidelines'),
        link('n-blog', t('website.main.nav.blog'), '/blog'),
      ],
    },
    {
      label: t('website.main.nav.safetyHub'),
      icon: 'fa-shield-heart',
      links: [
        link('n-approach', t('website.main.nav.ourApproach'), '/safety/approach'),
        link('n-advice', t('website.main.nav.advice'), '/safety/advice'),
        link('n-tools', t('website.main.nav.safetyTools'), '/safety/tools'),
        link('n-resources', t('website.main.nav.resources'), '/safety/resources'),
      ],
    },
    { label: t('website.main.nav.support'), icon: 'fa-life-ring', links: support },
  ];
}
