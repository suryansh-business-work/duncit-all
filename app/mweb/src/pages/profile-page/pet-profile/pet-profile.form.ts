import { z } from 'zod';

export const PET_SPECIES = ['DOG', 'CAT', 'BIRD', 'OTHER'] as const;
export type PetSpecies = (typeof PET_SPECIES)[number];

export const petProfileFormSchema = z.object({
  name: z
    .string({ error: 'Name is required' })
    .trim()
    .min(1, 'Name is required')
    .max(60, 'Name must be 60 characters or fewer'),
  species: z.enum(PET_SPECIES, {
    error: (issue) => (issue.input === undefined ? 'Species is required' : 'Select a valid species'),
  }),
  breed: z.string().trim().max(60).default(''),
  age_years: z
    .number({ error: 'Age must be a number' })
    .min(0, 'Age cannot be negative')
    .max(40, 'Age cannot exceed 40')
    .default(0),
  bio: z.string().trim().max(500).default(''),
  photo_url: z.string().trim().max(1000).default(''),
});

export type PetProfileFormValues = z.infer<typeof petProfileFormSchema>;

export function toPetProfileInput(values: PetProfileFormValues) {
  return {
    name: values.name.trim(),
    species: values.species,
    breed: values.breed.trim() || null,
    age_years: values.age_years || 0,
    bio: values.bio.trim() || null,
    photo_url: values.photo_url.trim() || null,
  };
}
