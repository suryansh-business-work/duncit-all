import * as yup from 'yup';

export const PERSON_NAME_PATTERN = /^[A-Za-z][A-Za-z .'-]{0,59}$/;
export const PHONE_NUMBER_PATTERN = /^\d{6,15}$/;
export const PHONE_EXTENSION_PATTERN = /^\+?\d{1,5}$/;
export const OTP_PATTERN = /^\d{4,8}$/;
export const POSTAL_CODE_PATTERN = /^[\dA-Za-z -]{3,12}$/;

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

const birthDate = (label = 'Birth year') =>
  yup
    .date()
    .typeError(`${label} is required`)
    .max(new Date(), `${label} must be in the past`)
    .test('minimum-age', 'You must be at least 13 years old', (value) => {
      if (!value) return false;
      const minDate = new Date();
      minDate.setFullYear(minDate.getFullYear() - 13);
      return value <= minDate;
    })
    .required(`${label} is required`);

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
  phoneNumber: (label = 'Phone number') =>
    yup.string().trim().matches(PHONE_NUMBER_PATTERN, `${label} must contain only digits (6-15 digits)`).required(`${label} is required`),
  phoneExtension: (label = 'Phone code') =>
    yup.string().trim().matches(PHONE_EXTENSION_PATTERN, `${label} is invalid`).required(`${label} is required`),
  otp: () => yup.string().trim().matches(OTP_PATTERN, 'Enter the OTP we sent').required('OTP is required'),
  birthDate,
  optionalUrl,
};