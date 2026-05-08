import * as yup from 'yup';
import { STATUSES } from './user.constants';

const phoneRegex = /^[0-9]{6,15}$/;
const extRegex = /^\+?[0-9]{1,5}$/;

export const registerSchema = yup.object({
  first_name: yup.string().min(1).max(60).required(),
  last_name: yup.string().min(1).max(60).required(),
  email: yup.string().email().required(),
  phone_number: yup.string().matches(phoneRegex, 'Invalid phone').required(),
  phone_extension: yup.string().matches(extRegex, 'Invalid extension').required(),
  password: yup.string().min(8).max(100).required(),
  dob: yup.date().max(new Date(), 'DOB must be in the past').required(),
  city: yup.string().optional(),
  zone: yup.string().optional(),
});

export const loginSchema = yup.object({
  email: yup.string().email().required(),
  password: yup.string().min(8).required(),
});

export const googleSignupSchema = yup.object({
  id_token: yup.string().min(20).required(),
  phone_number: yup.string().matches(phoneRegex, 'Invalid phone').required(),
  phone_extension: yup.string().matches(extRegex, 'Invalid extension').required(),
  dob: yup.date().max(new Date(), 'DOB must be in the past').required(),
  city: yup.string().optional(),
  zone: yup.string().optional(),
});

export const createUserSchema = yup.object({
  first_name: yup.string().min(1).max(60).required(),
  last_name: yup.string().min(1).max(60).required(),
  email: yup.string().email().optional(),
  phone_number: yup.string().matches(phoneRegex).required(),
  phone_extension: yup.string().matches(extRegex).required(),
  password: yup.string().min(8).required(),
  dob: yup.date().max(new Date()).required(),
  roles: yup.array().of(yup.string().required()).min(1).required(),
  city: yup.string().optional(),
  zone: yup.string().optional(),
  assigned_city: yup.string().optional(),
  assigned_zones: yup.array().of(yup.string()).optional(),
});

export const updateUserSchema = yup.object({
  first_name: yup.string().min(1).max(60).optional(),
  last_name: yup.string().min(1).max(60).optional(),
  email: yup.string().email().optional(),
  phone_number: yup.string().matches(phoneRegex).optional(),
  phone_extension: yup.string().matches(extRegex).optional(),
  dob: yup.date().max(new Date()).optional(),
  city: yup.string().optional(),
  zone: yup.string().optional(),
  bio: yup.string().max(500).optional(),
  profile_photo: yup.string().url().optional(),
  status: yup.string().oneOf(STATUSES as readonly string[]).optional(),
  roles: yup.array().of(yup.string().required()).optional(),
  assigned_city: yup.string().optional(),
  assigned_zones: yup.array().of(yup.string()).optional(),
});

const profileLinkSchema = yup.object({
  label: yup.string().trim().min(1).max(40).required(),
  url: yup.string().trim().url().max(2048).required(),
});

export const updateMyProfileSchema = yup.object({
  first_name: yup.string().min(1).max(60).optional(),
  last_name: yup.string().min(1).max(60).optional(),
  bio: yup.string().max(500).optional(),
  profile_photo: yup.string().url().optional(),
  profile_links: yup.array().of(profileLinkSchema).max(5).optional(),
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

export type RegisterDTO = yup.InferType<typeof registerSchema>;
export type LoginDTO = yup.InferType<typeof loginSchema>;
export type GoogleSignupDTO = yup.InferType<typeof googleSignupSchema>;
export type CreateUserDTO = yup.InferType<typeof createUserSchema>;
export type UpdateUserDTO = yup.InferType<typeof updateUserSchema>;
export type UpdateMyProfileDTO = yup.InferType<typeof updateMyProfileSchema>;
export type PetProfileDTO = yup.InferType<typeof petProfileSchema>;
