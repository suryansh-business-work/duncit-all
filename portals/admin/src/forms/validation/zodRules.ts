import { z } from 'zod';
import {
  PERSON_NAME_PATTERN,
  PHONE_NUMBER_PATTERN,
  PHONE_EXTENSION_PATTERN,
} from './rules';

/**
 * Zod counterparts of the shared yup `validationRules`, used by the RHF+Zod
 * admin forms. Mirrors the messages 1:1 so behaviour and copy stay identical.
 */
export const zodRules = {
  personName: (label: string) =>
    z
      .string()
      .trim()
      .min(1, `${label} is required`)
      .regex(PERSON_NAME_PATTERN, `${label} can use letters, spaces, apostrophes, periods and hyphens only`),
  optionalText: (label: string, max: number) =>
    z.string().trim().max(max, `${label} must be ${max} characters or fewer`),
  optionalEmail: (label = 'Email') =>
    z.union([
      z.literal(''),
      z
        .string()
        .trim()
        .max(254)
        .email(`Enter a valid ${label.toLowerCase()}`)
        .transform((value) => value.toLowerCase()),
    ]),
  phoneNumber: (label = 'Phone number') =>
    z
      .string()
      .trim()
      .regex(PHONE_NUMBER_PATTERN, `${label} must contain only digits (6-15 digits)`),
  phoneExtension: (label = 'Phone code') =>
    z.string().trim().regex(PHONE_EXTENSION_PATTERN, `${label} is invalid`),
};
