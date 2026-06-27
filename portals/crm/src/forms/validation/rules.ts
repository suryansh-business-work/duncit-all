import { z } from 'zod';

/** Shared, reusable Zod field rules so every form validates consistently. */
export const validationRules = {
  email: (label = 'Email') =>
    z
      .string()
      .trim()
      .min(1, `${label} is required`)
      .max(254, `${label} is too long`)
      .email(`Enter a valid ${label.toLowerCase()}`)
      .transform((v) => v.toLowerCase()),
  password: (label = 'Password') =>
    z
      .string()
      .min(1, `${label} is required`)
      .min(8, `${label} must be at least 8 characters`)
      .max(128, `${label} is too long`),
};
