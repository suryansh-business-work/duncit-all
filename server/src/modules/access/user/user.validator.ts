import * as yup from 'yup';
import { STATUSES } from './user.constants';

// Shared by the auth (signup) and profile (self-service edit) validators too —
// one definition so the three surfaces can never drift apart.
export const phoneRegex = /^\d{6,15}$/;
export const extRegex = /^\+?\d{1,5}$/;

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
  status: yup.string().oneOf(STATUSES).optional(),
  roles: yup.array().of(yup.string().required()).optional(),
  assigned_city: yup.string().optional(),
  assigned_zones: yup.array().of(yup.string()).optional(),
  host_share_pct: yup.number().min(0).max(100).optional(),
  host_commission_pct: yup.number().min(0).max(100).optional(),
});

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

export type CreateUserDTO = yup.InferType<typeof createUserSchema>;
export type UpdateUserDTO = yup.InferType<typeof updateUserSchema>;
export type RecordUserContactActionDTO = yup.InferType<typeof recordUserContactActionSchema>;
export type StartRecordedUserCallDTO = yup.InferType<typeof startRecordedUserCallSchema>;
