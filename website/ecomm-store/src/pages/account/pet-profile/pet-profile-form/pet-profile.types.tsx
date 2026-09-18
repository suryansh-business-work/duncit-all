import { z } from 'zod';

import { optionalRule, requiredRule } from '../../../../lib/validation';

type Translate = (key: string) => string;

/** The pet the store greets by name. Age is optional and in whole years. */
export const makePetProfileSchema = (t: Translate) =>
  z.object({
    name: requiredRule(t, 'ecommStore.pet.nameRequired', 60),
    species: optionalRule(t, 60),
    breed: optionalRule(t, 80),
    age: z
      .string()
      .trim()
      .refine((value) => value === '' || /^\d{1,2}$/.test(value), t('ecommStore.pet.ageInvalid')),
    bio: optionalRule(t, 500),
  });

export type PetProfileValues = z.infer<ReturnType<typeof makePetProfileSchema>>;
