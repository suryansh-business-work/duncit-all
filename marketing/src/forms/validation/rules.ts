import * as yup from 'yup';

export const SLUG_KEY_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

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
  email: (label = 'Email') =>
    yup
      .string()
      .trim()
      .lowercase()
      .email(`Enter a valid ${label.toLowerCase()}`)
      .max(254, `${label} is too long`)
      .required(`${label} is required`),
  password: (label = 'Password') =>
    yup
      .string()
      .min(8, `${label} must be at least 8 characters`)
      .max(128, `${label} is too long`)
      .required(`${label} is required`),
  optionalText,
  requiredText,
  optionalUrl,
};
