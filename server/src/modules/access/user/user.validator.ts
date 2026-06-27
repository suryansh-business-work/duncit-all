import * as yup from 'yup';
import { STATUSES } from './user.constants';

const phoneRegex = /^[0-9]{6,15}$/;
const extRegex = /^\+?[0-9]{1,5}$/;

export const registerSchema = yup.object({
  first_name: yup.string().min(1).max(60).required(),
  // last_name is optional: the simplified signup collects a single "Name" that
  // may be a single word, so the surname can be empty.
  last_name: yup.string().min(1).max(60).optional(),
  email: yup.string().email().required(),
  // Phone is no longer collected at signup; it is gathered later (profile).
  phone_number: yup
    .string()
    .matches(phoneRegex, { message: 'Invalid phone', excludeEmptyString: true })
    .optional(),
  phone_extension: yup
    .string()
    .matches(extRegex, { message: 'Invalid extension', excludeEmptyString: true })
    .optional(),
  password: yup.string().min(8).max(100).required(),
  dob: yup.date().max(new Date(), 'DOB must be in the past').required(),
  city: yup.string().optional(),
  zone: yup.string().optional(),
});

export const loginSchema = yup.object({
  email: yup.string().email().required(),
  password: yup.string().min(8).required(),
});

export const requestPasswordResetSchema = yup.object({
  email: yup.string().email().required(),
});

export const resetPasswordSchema = yup.object({
  email: yup.string().email().required(),
  otp: yup
    .string()
    .matches(/^\d{6}$/, 'Enter the 6 digit OTP')
    .required(),
  new_password: yup.string().min(8).max(100).required(),
});

export const googleSignupSchema = yup.object({
  id_token: yup.string().min(20).required(),
  // Token-only Google signup: the account is created from the verified Google
  // profile and the user lands straight on the survey. Phone/dob are optional
  // and collected later.
  phone_number: yup
    .string()
    .matches(phoneRegex, { message: 'Invalid phone', excludeEmptyString: true })
    .optional(),
  phone_extension: yup
    .string()
    .matches(extRegex, { message: 'Invalid extension', excludeEmptyString: true })
    .optional(),
  dob: yup.date().max(new Date(), 'DOB must be in the past').optional(),
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
  host_share_pct: yup.number().min(0).max(100).optional(),
  host_commission_pct: yup.number().min(0).max(100).optional(),
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

export const recordUserContactActionSchema = yup.object({
  user_id: yup.string().required(),
  type: yup.string().oneOf(['CALL', 'EMAIL']).required(),
  target: yup.string().trim().min(3).max(254).required(),
  subject: yup.string().trim().max(160).default(''),
  notes: yup.string().trim().max(2000).default(''),
  status: yup.string().trim().max(40).default('LOGGED'),
  duration_seconds: yup.number().integer().min(0).default(0),
  recording_url: yup.string().trim().url().max(2048).default(''),
});

export const startRecordedUserCallSchema = yup.object({
  user_id: yup.string().required(),
  target: yup.string().trim().min(3).max(64).required(),
  notes: yup.string().trim().max(2000).default(''),
});

export type RegisterDTO = yup.InferType<typeof registerSchema>;
export type LoginDTO = yup.InferType<typeof loginSchema>;
export type RequestPasswordResetDTO = yup.InferType<typeof requestPasswordResetSchema>;
export type ResetPasswordDTO = yup.InferType<typeof resetPasswordSchema>;
export type GoogleSignupDTO = yup.InferType<typeof googleSignupSchema>;
export type CreateUserDTO = yup.InferType<typeof createUserSchema>;
export type UpdateUserDTO = yup.InferType<typeof updateUserSchema>;
export type UpdateMyProfileDTO = yup.InferType<typeof updateMyProfileSchema>;
export type PetProfileDTO = yup.InferType<typeof petProfileSchema>;
export type RecordUserContactActionDTO = yup.InferType<typeof recordUserContactActionSchema>;
export type StartRecordedUserCallDTO = yup.InferType<typeof startRecordedUserCallSchema>;
