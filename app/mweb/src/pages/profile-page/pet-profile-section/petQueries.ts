import { gql } from '@apollo/client';
import * as yup from 'yup';

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

export const petSchema = yup.object({
  name: yup.string().max(60).optional(),
  species: yup.string().max(40).optional(),
  breed: yup.string().max(60).optional(),
  age: yup
    .number()
    .typeError('Age must be a number')
    .min(0, 'Age must be 0 or more')
    .max(100, 'Age looks too large')
    .optional(),
  photo_url: yup.string().url('Must be a valid URL').optional(),
  bio: yup.string().max(500, 'Bio must be 500 characters or fewer').optional(),
});

export interface PetProfile {
  name?: string | null;
  species?: string | null;
  breed?: string | null;
  age?: number | null;
  photo_url?: string | null;
  bio?: string | null;
}
