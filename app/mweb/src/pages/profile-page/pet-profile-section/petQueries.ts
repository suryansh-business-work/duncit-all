import { gql } from '@apollo/client';
import { z } from 'zod';

export const UPDATE_PET = gql`
  mutation UpdateMyPetProfile($input: PetProfileInput!) {
    updateMyPetProfile(input: $input) {
      user_id
      pet_profile {
        name
        species
        breed
        age
        photo_url
        bio
      }
    }
  }
`;

const ageField = z.union([z.literal(''), z.coerce.number()]).superRefine((value, ctx) => {
  if (value === '') {
    return;
  }
  if (Number.isNaN(value)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Age must be a number' });
    return;
  }
  if (value < 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Age must be 0 or more' });
  }
  if (value > 100) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Age looks too large' });
  }
});

const photoUrlField = z.string().superRefine((value, ctx) => {
  if (!value) {
    return;
  }
  try {
    new URL(value);
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Must be a valid URL' });
  }
});

export const petSchema = z.object({
  name: z.string().max(60),
  species: z.string().max(40),
  breed: z.string().max(60),
  age: ageField,
  photo_url: photoUrlField,
  bio: z.string().max(500, 'Bio must be 500 characters or fewer'),
});

export type PetFormValues = z.infer<typeof petSchema>;

export interface PetProfile {
  name?: string | null;
  species?: string | null;
  breed?: string | null;
  age?: number | null;
  photo_url?: string | null;
  bio?: string | null;
}
