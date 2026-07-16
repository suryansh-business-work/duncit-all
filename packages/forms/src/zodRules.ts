import { z } from 'zod';
import {
  PERSON_NAME_PATTERN,
  PHONE_NUMBER_PATTERN,
  PHONE_EXTENSION_PATTERN,
} from './patterns';

export interface EmailRuleOptions {
  /**
   * Run the 254-char max check BEFORE the email-format check (crm and
   * partners-app ordering: over-long invalid input reports "too long"
   * instead of "enter a valid email"). Default: format first.
   */
  lengthFirst?: boolean;
}

export interface PasswordRuleOptions {
  /** Prepend a `min(1, "<label> is required")` check (crm spelling). */
  required?: boolean;
  /**
   * Use `required_error` on the base string (support spelling; only differs
   * from the default when the parsed value is `undefined`).
   */
  requiredError?: boolean;
}

export interface OptionalRuleOptions {
  /** Append `.default('')` so `undefined` parses to `''` (marketing spelling). */
  defaultEmpty?: boolean;
}

const RELATIVE_PATH_PATTERN = /^\/[\w./?=&%#:+-]*$/;
const ALLOWED_URL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

const isValidUrl = (value: string, allowRelative: boolean) => {
  if (!value) return true;
  if (allowRelative && RELATIVE_PATH_PATTERN.test(value)) return true;
  try {
    const parsed = new URL(value);
    return ALLOWED_URL_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
};

const email = (label = 'Email', options: Readonly<EmailRuleOptions> = {}) => {
  const base = z.string().trim().toLowerCase().min(1, `${label} is required`);
  if (options.lengthFirst) {
    return base.max(254, `${label} is too long`).email(`Enter a valid ${label.toLowerCase()}`);
  }
  return base.email(`Enter a valid ${label.toLowerCase()}`).max(254, `${label} is too long`);
};

const password = (label = 'Password', options: Readonly<PasswordRuleOptions> = {}) => {
  const base = options.requiredError
    ? z.string({ required_error: `${label} is required` })
    : z.string();
  const withRequired = options.required ? base.min(1, `${label} is required`) : base;
  return withRequired
    .min(8, `${label} must be at least 8 characters`)
    .max(128, `${label} is too long`);
};

const personName = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .regex(PERSON_NAME_PATTERN, `${label} can use letters, spaces, apostrophes, periods and hyphens only`);

/** Optional free text that trims and caps length (`defaultEmpty` adds `.default('')`). */
export const optionalText = (
  label: string,
  max: number,
  options: Readonly<OptionalRuleOptions> = {},
) => {
  const base = z.string().trim().max(max, `${label} must be ${max} characters or fewer`);
  if (options.defaultEmpty) {
    return base.default('');
  }
  return base;
};

/** Required, trimmed free text with min/max constraints. */
export const requiredText = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be ${max} characters or fewer`);

const optionalEmail = (label = 'Email') =>
  z.union([
    z.literal(''),
    z
      .string()
      .trim()
      .max(254)
      .email(`Enter a valid ${label.toLowerCase()}`)
      .transform((value) => value.toLowerCase()),
  ]);

const phoneNumber = (label = 'Phone number') =>
  z
    .string()
    .trim()
    .regex(PHONE_NUMBER_PATTERN, `${label} must contain only digits (6-15 digits)`);

const phoneExtension = (label = 'Phone code') =>
  z.string().trim().regex(PHONE_EXTENSION_PATTERN, `${label} is invalid`);

/** Optional URL: blank passes; otherwise must be http/https/mailto/tel (or a relative path when allowed). */
export const optionalUrl = (
  label: string,
  allowRelative = false,
  options: Readonly<OptionalRuleOptions> = {},
) => {
  const check = (value: string) => isValidUrl(value, allowRelative);
  const message = `${label} must be a valid URL`;
  if (options.defaultEmpty) {
    return z.string().trim().default('').refine(check, message);
  }
  return z.string().trim().refine(check, message);
};

/** Shared, reusable Zod field rules so every form validates consistently. */
export const zodRules = {
  email,
  password,
  personName,
  optionalText,
  requiredText,
  optionalEmail,
  phoneNumber,
  phoneExtension,
  optionalUrl,
};

/** Alias for the portals that exported the same rule set as `validationRules`. */
export const validationRules = zodRules;
