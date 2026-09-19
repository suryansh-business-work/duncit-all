import { z } from 'zod';
import { makeRules } from '../../../lib/rules';
import type { Translate } from '../../../lib/translate';
import type { StoreBrand } from '../../../queries/taxonomy';

/** Mirrors the server's `StoreBrandInput`. */
export const makeBrandSchema = (t: Translate) => {
  const rules = makeRules(t);
  return z.object({
    ...rules.identity(),
    logo_url: rules.link(),
    tagline: rules.optionalText(120),
    is_active: z.boolean(),
  });
};

export type BrandValues = z.infer<ReturnType<typeof makeBrandSchema>>;

/** The form's starting values — a blank, switched-on brand when creating. */
export const toBrandValues = (brand: StoreBrand | null): BrandValues => ({
  name: brand?.name ?? '',
  slug: brand?.slug ?? '',
  description: brand?.description ?? '',
  logo_url: brand?.logo_url ?? '',
  tagline: brand?.tagline ?? '',
  is_active: brand?.is_active ?? true,
});
