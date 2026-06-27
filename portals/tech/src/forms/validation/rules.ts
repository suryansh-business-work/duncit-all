import { z } from 'zod';

export const SLUG_KEY_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

/** Shared, reusable Zod field rules so every form validates consistently. */
export const validationRules = {
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
};
