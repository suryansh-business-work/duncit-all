import * as yup from 'yup';

export const PERSON_NAME_PATTERN = /^[A-Za-z][A-Za-z .'-]{0,59}$/;
export const PHONE_NUMBER_PATTERN = /^\d{6,15}$/;
export const PHONE_EXTENSION_PATTERN = /^\+?\d{1,5}$/;
export const SLUG_KEY_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
export const PAN_PATTERN = /^[A-Z]{5}\d{4}[A-Z]$/;
export const AADHAR_PATTERN = /^\d{12}$/;
export const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/;

const optionalText = (label: string, max: number) =>
  yup.string().trim().max(max, `${label} must be ${max} characters or fewer`).default('');

const requiredText = (label: string, min: number, max: number) =>
  yup
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be ${max} characters or fewer`)
    .required(`${label} is required`);

const optionalUrl = (label: string, allowRelative = false) =>
  yup
    .string()
    .trim()
    .default('')
    .test('url', `${label} must be a valid URL`, (value) => {
      if (!value) return true;
      if (allowRelative && /^\/[\w./?=&%#:+-]*$/.test(value)) return true;
      try {
        const parsed = new URL(value);
        return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    });

/** Shared, reusable Yup field rules so every form validates consistently. */
export const validationRules = {
  personName: (label: string) =>
    yup
      .string()
      .trim()
      .matches(PERSON_NAME_PATTERN, `${label} can use letters, spaces, apostrophes, periods and hyphens only`)
      .required(`${label} is required`),
  optionalText,
  requiredText,
  email: (label = 'Email') =>
    yup.string().trim().lowercase().email(`Enter a valid ${label.toLowerCase()}`).max(254).required(`${label} is required`),
  optionalEmail: (label = 'Email') =>
    yup.string().trim().lowercase().email(`Enter a valid ${label.toLowerCase()}`).max(254).default(''),
  password: (label = 'Password') =>
    yup
      .string()
      .min(8, `${label} must be at least 8 characters`)
      .max(128, `${label} is too long`)
      .required(`${label} is required`),
  phoneNumber: (label = 'Phone number') =>
    yup.string().trim().matches(PHONE_NUMBER_PATTERN, `${label} must contain only digits (6-15 digits)`).required(`${label} is required`),
  phoneExtension: (label = 'Phone code') =>
    yup.string().trim().matches(PHONE_EXTENSION_PATTERN, `${label} is invalid`).required(`${label} is required`),
  slugKey: (label: string) =>
    yup.string().trim().matches(SLUG_KEY_PATTERN, `${label} may contain lowercase letters, digits, dashes and underscores`).required(`${label} is required`),
  optionalUrl,
};
