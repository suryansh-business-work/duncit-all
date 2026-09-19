import { z } from 'zod';
import { makeRules } from '../../../lib/rules';
import type { Translate } from '../../../lib/translate';
import type { StorePetType } from '../../../queries/taxonomy';

/** Mirrors the server's `StorePetTypeInput`. */
export const makePetTypeSchema = (t: Translate) => {
  const rules = makeRules(t);
  return z.object({
    ...rules.identity(),
    icon_url: rules.link(),
    image_url: rules.link(),
    is_active: z.boolean(),
    category_ids: rules.ids(),
  });
};

export type PetTypeValues = z.infer<ReturnType<typeof makePetTypeSchema>>;

/** The form's starting values — a blank, switched-on pet type when creating. */
export const toPetTypeValues = (petType: StorePetType | null): PetTypeValues => ({
  name: petType?.name ?? '',
  slug: petType?.slug ?? '',
  description: petType?.description ?? '',
  icon_url: petType?.icon_url ?? '',
  image_url: petType?.image_url ?? '',
  is_active: petType?.is_active ?? true,
  category_ids: petType?.category_ids ?? [],
});
