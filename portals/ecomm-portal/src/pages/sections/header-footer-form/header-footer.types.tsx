import { z } from 'zod';
import { makeRules } from '../../../lib/rules';
import type { Translate } from '../../../lib/translate';
import type { StoreNavLink, StoreSettings } from '../../settings/queries';

/** The store keeps at most this many header links, and as many footer links. */
export const MAX_NAV_LINKS = 12;
/** The phone home page's greeting line, as the server stores it. */
export const GREETING_MAX = 80;
const LABEL_MAX = 40;

export const BLANK_NAV_LINK: StoreNavLink = { label: '', link: '' };

export const makeHeaderFooterSchema = (t: Translate) => {
  const r = makeRules(t);
  // A header or footer link needs both halves: the server drops a row without a label or a store link.
  const navLink = z.object({
    label: r.requiredText(LABEL_MAX),
    link: r.storeLink().refine((value) => value !== '', t('ecommPortal.form.required')),
  });
  return z.object({
    announcement_enabled: z.boolean(),
    announcement_text: r.optionalText(200),
    announcement_link: r.link(),
    home_greeting: r.optionalText(GREETING_MAX),
    nav_links: z.array(navLink).max(MAX_NAV_LINKS),
    footer_links: z.array(navLink).max(MAX_NAV_LINKS),
  });
};

export type HeaderFooterValues = z.infer<ReturnType<typeof makeHeaderFooterSchema>>;

const linksOf = (links: readonly StoreNavLink[]): StoreNavLink[] => links.map(({ label, link }) => ({ label, link }));

export const toHeaderFooterValues = (s: StoreSettings): HeaderFooterValues => ({
  announcement_enabled: s.announcement_enabled,
  announcement_text: s.announcement_text,
  announcement_link: s.announcement_link,
  home_greeting: s.home_greeting,
  nav_links: linksOf(s.nav_links),
  footer_links: linksOf(s.footer_links),
});

/** Only the fields this tab owns — the save leaves every other setting as it is. */
export const toHeaderFooterInput = (values: HeaderFooterValues): Record<string, unknown> => ({
  announcement_enabled: values.announcement_enabled,
  announcement_text: values.announcement_text,
  announcement_link: values.announcement_link,
  home_greeting: values.home_greeting,
  nav_links: linksOf(values.nav_links),
  footer_links: linksOf(values.footer_links),
});
