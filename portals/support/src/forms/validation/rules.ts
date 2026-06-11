import * as yup from 'yup';

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
};
