import * as yup from 'yup';

export const PET_SPECIES = ['DOG', 'CAT', 'BIRD', 'OTHER'] as const;
export type PetSpecies = (typeof PET_SPECIES)[number];

export const petProfileFormSchema = yup.object({
  name: yup
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(60, 'Name must be 60 characters or fewer')
    .required('Name is required'),
  species: yup
    .mixed<PetSpecies>()
    .oneOf([...PET_SPECIES], 'Select a valid species')
    .required('Species is required'),
  breed: yup.string().trim().max(60).default(''),
  age_years: yup
    .number()
    .typeError('Age must be a number')
    .min(0, 'Age cannot be negative')
    .max(40, 'Age cannot exceed 40')
    .default(0),
  bio: yup.string().trim().max(500).default(''),
  photo_url: yup.string().trim().max(1000).default(''),
});

export type PetProfileFormValues = yup.InferType<typeof petProfileFormSchema>;

export function toPetProfileInput(values: PetProfileFormValues) {
  const cast = petProfileFormSchema.cast(values, { stripUnknown: true });
  return {
    name: cast.name,
    species: cast.species,
    breed: cast.breed || null,
    age_years: Number(cast.age_years) || 0,
    bio: cast.bio || null,
    photo_url: cast.photo_url || null,
  };
}
