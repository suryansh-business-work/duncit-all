import * as yup from 'yup';
import { phoneRegex, extRegex } from '@modules/access/user/user.validator';

const profileLinkSchema = yup.object({
  label: yup.string().trim().min(1).max(40).required(),
  url: yup.string().trim().url().max(2048).required(),
});

// Structured main postal address — reused by the profile update. Every part is
// optional (users fill it gradually); lengths guard the DB fields.
export const postalAddressSchema = yup.object({
  line1: yup.string().trim().max(200).optional(),
  line2: yup.string().trim().max(200).optional(),
  landmark: yup.string().trim().max(160).optional(),
  city: yup.string().trim().max(120).optional(),
  state: yup.string().trim().max(120).optional(),
  pincode: yup.string().trim().max(12).optional(),
  country: yup.string().trim().max(80).optional(),
});

export const updateMyProfileSchema = yup.object({
  first_name: yup.string().min(1).max(60).optional(),
  last_name: yup.string().min(1).max(60).optional(),
  bio: yup.string().max(500).optional(),
  profile_photo: yup.string().url().optional(),
  profile_links: yup.array().of(profileLinkSchema).max(5).optional(),
  // Location + DOB are accepted by the GraphQL input and mapped in the service;
  // they must be declared here or `validate({ stripUnknown: true })` drops them.
  city: yup.string().max(80).optional(),
  state: yup.string().max(80).optional(),
  zone: yup.string().max(80).optional(),
  country: yup.string().max(80).optional(),
  dob: yup
    .string()
    .matches(/^$|^\d{4}-\d{2}-\d{2}$/, { message: 'Use the format YYYY-MM-DD', excludeEmptyString: true })
    .optional(),
  // Contact + WhatsApp numbers: previously undeclared, so edits were silently
  // dropped before reaching the service (the numbers-not-saving bug).
  phone_number: yup
    .string()
    .matches(phoneRegex, { message: 'Invalid phone', excludeEmptyString: true })
    .optional(),
  phone_extension: yup
    .string()
    .matches(extRegex, { message: 'Invalid extension', excludeEmptyString: true })
    .optional(),
  whatsapp_number: yup
    .string()
    .matches(phoneRegex, { message: 'Invalid WhatsApp number', excludeEmptyString: true })
    .optional(),
  whatsapp_extension: yup
    .string()
    .matches(extRegex, { message: 'Invalid WhatsApp extension', excludeEmptyString: true })
    .optional(),
  // The saved main postal address; every part optional so partial edits are ok.
  address: postalAddressSchema.optional(),
});

export const petProfileSchema = yup.object({
  name: yup.string().max(60).nullable().optional(),
  species: yup.string().max(40).nullable().optional(),
  breed: yup.string().max(60).nullable().optional(),
  age: yup.number().min(0).max(100).nullable().optional(),
  photo_url: yup.string().url().nullable().optional(),
  bio: yup.string().max(500).nullable().optional(),
});

export const interestCategoryIdsSchema = yup
  .array()
  .of(yup.string().required())
  .min(1, 'Select at least one interest')
  .max(60, 'Select fewer interests')
  .required();

export type UpdateMyProfileDTO = yup.InferType<typeof updateMyProfileSchema>;
export type PetProfileDTO = yup.InferType<typeof petProfileSchema>;
