import { z } from 'zod';

export const SLUG_KEY_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

const isAllowedUrl = (value: string, allowRelative: boolean) => {
  if (!value) return true;
  if (allowRelative && /^\/[\w./?=&%#:+-]*$/.test(value)) return true;
  try {
    const parsed = new URL(value);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

/** Optional free text that trims and caps length, defaulting to ''. */
export const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .default('');

/** Required, trimmed free text with min/max constraints. */
export const requiredText = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be ${max} characters or fewer`);

/** Optional URL: blank passes; otherwise must be http/https/mailto/tel (or a relative path when allowed). */
export const optionalUrl = (label: string, allowRelative = false) =>
  z
    .string()
    .trim()
    .default('')
    .refine((value) => isAllowedUrl(value, allowRelative), `${label} must be a valid URL`);

/** Shared, reusable Zod field rules so every form validates consistently. */
export const zodRules = {
  email: (label = 'Email') =>
    z
      .string()
      .trim()
      .toLowerCase()
      .min(1, `${label} is required`)
      .email(`Enter a valid ${label.toLowerCase()}`)
      .max(254, `${label} is too long`),
  password: (label = 'Password') =>
    z
      .string()
      .min(8, `${label} must be at least 8 characters`)
      .max(128, `${label} is too long`),
  optionalText,
  requiredText,
  optionalUrl,
};
