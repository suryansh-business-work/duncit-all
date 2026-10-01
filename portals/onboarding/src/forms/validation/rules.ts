import { z } from 'zod';

export const PERSON_NAME_PATTERN = /^[A-Za-z][A-Za-z .'-]{0,59}$/;
export const PHONE_NUMBER_PATTERN = /^\d{6,15}$/;
export const PHONE_EXTENSION_PATTERN = /^\+?\d{1,5}$/;
export const SLUG_KEY_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
export const PAN_PATTERN = /^[A-Z]{5}\d{4}[A-Z]$/;
export const AADHAR_PATTERN = /^\d{12}$/;
export const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/;

const optionalText = (label: string, max: number) =>
  z.string().trim().max(max, `${label} must be ${max} characters or fewer`).default('');

const requiredText = (label: string, min: number, max: number) => {
  const required = `${label} is required`;
  return z
    .string({ error: required })
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be ${max} characters or fewer`)
    .min(1, required);
};

const optionalUrl = (label: string, allowRelative = false) =>
  z
    .string()
    .trim()
    .refine((value) => {
      if (!value) return true;
      if (allowRelative && /^\/[\w./?=&%#:+-]*$/.test(value)) return true;
      try {
        const parsed = new URL(value);
        return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    }, `${label} must be a valid URL`)
    .default('');

/** Blank passes: whether an address is required is the caller's rule, not this one's. */
const isBlankOrEmail = (value: string) => !value || z.regexes.html5Email.test(value);

/** Shared, reusable Zod field rules so every form validates consistently. */
export const validationRules = {
  personName: (label: string) =>
    z
      .string({ error: `${label} is required` })
      .trim()
      .regex(PERSON_NAME_PATTERN, `${label} can use letters, spaces, apostrophes, periods and hyphens only`),
  optionalText,
  requiredText,
  email: (label = 'Email') => {
    const required = `${label} is required`;
    return z
      .string({ error: required })
      .trim()
      .toLowerCase()
      .refine(isBlankOrEmail, `Enter a valid ${label.toLowerCase()}`)
      .min(1, required)
      // Piped so the length cap reports its own message rather than the required one.
      .pipe(z.string().max(254));
  },
  optionalEmail: (label = 'Email') =>
    z.string().trim().toLowerCase().refine(isBlankOrEmail, `Enter a valid ${label.toLowerCase()}`).max(254).default(''),
  password: (label = 'Password') =>
    z
      .string({ error: `${label} is required` })
      .min(8, `${label} must be at least 8 characters`)
      .max(128, `${label} is too long`),
  phoneNumber: (label = 'Phone number') =>
    z
      .string({ error: `${label} is required` })
      .trim()
      .regex(PHONE_NUMBER_PATTERN, `${label} must contain only digits (6-15 digits)`),
  phoneExtension: (label = 'Phone code') =>
    z.string({ error: `${label} is required` }).trim().regex(PHONE_EXTENSION_PATTERN, `${label} is invalid`),
  slugKey: (label: string) =>
    z
      .string({ error: `${label} is required` })
      .trim()
      .regex(SLUG_KEY_PATTERN, `${label} may contain lowercase letters, digits, dashes and underscores`),
  optionalUrl,
};
