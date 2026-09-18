import { z } from 'zod';
import { makeRules } from '../../../lib/rules';
import type { Translate } from '../../../lib/translate';
import type { StoreFacet } from '../../../queries/taxonomy';

/** Mirrors the server's `StoreFacetInput` — a filter needs at least one option. */
export const makeFacetSchema = (t: Translate) => {
  const rules = makeRules(t);
  return z.object({
    name: rules.requiredText(60),
    slug: rules.optionalText(80),
    is_active: z.boolean(),
    options: z
      .array(z.object({ label: rules.requiredText(60), slug: rules.optionalText(80) }))
      .min(1, t('ecommPortal.filters.optionsRequired')),
  });
};

export type FacetValues = z.infer<ReturnType<typeof makeFacetSchema>>;

export const BLANK_FACET_OPTION = { label: '', slug: '' };

export const toFacetValues = (facet: StoreFacet | null): FacetValues => ({
  name: facet?.name ?? '',
  slug: facet?.slug ?? '',
  is_active: facet?.is_active ?? true,
  options: facet?.options.map((option) => ({ label: option.label, slug: option.slug })) ?? [BLANK_FACET_OPTION],
});
