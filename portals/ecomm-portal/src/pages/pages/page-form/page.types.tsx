import { z } from 'zod';
import { makeRules } from '../../../lib/rules';
import type { Translate } from '../../../lib/translate';
import type { StorePage } from '../../../queries/pages';

/** Mirrors the server's `StorePageInput`. */
export const makePageSchema = (t: Translate) => {
  const rules = makeRules(t);
  return z.object({
    title: rules.requiredText(120),
    slug: rules.optionalText(120),
    content_html: z.string(),
    show_in_footer: z.boolean(),
    is_active: z.boolean(),
    ...rules.seo(),
  });
};

export type PageValues = z.infer<ReturnType<typeof makePageSchema>>;

/** The form's starting values — a blank, switched-on page in the footer when creating. */
export const toPageValues = (page: StorePage | null): PageValues => ({
  title: page?.title ?? '',
  slug: page?.slug ?? '',
  content_html: page?.content_html ?? '',
  show_in_footer: page?.show_in_footer ?? true,
  is_active: page?.is_active ?? true,
  seo_title: page?.seo_title ?? '',
  seo_description: page?.seo_description ?? '',
});
