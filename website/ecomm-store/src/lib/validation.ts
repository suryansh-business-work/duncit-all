import { z } from 'zod';
import { EMAIL, PHONE_NUMBER, PINCODE, toDigits } from '@duncit/regex';

/**
 * The store's field rules, built once and shared by every form so an email or
 * a pincode is judged the same way everywhere. Shapes come from @duncit/regex;
 * the sentences come from the store's catalogue.
 */
type Translate = (key: string) => string;

export const emailRule = (t: Translate) =>
  z
    .string()
    .trim()
    .min(1, t('ecommStore.validation.emailRequired'))
    .max(254, t('ecommStore.validation.emailTooLong'))
    .regex(EMAIL, t('ecommStore.validation.emailInvalid'));

/** A 10-digit mobile number, judged on its digits so a pasted "+91 98…" still passes. */
export const phoneRule = (t: Translate) =>
  z
    .string()
    .transform((value) => toDigits(value).slice(-10))
    .refine((value) => PHONE_NUMBER.test(value), t('ecommStore.validation.phoneInvalid'));

export const pincodeRule = (t: Translate) =>
  z
    .string()
    .trim()
    .refine((value) => PINCODE.test(value), t('ecommStore.validation.pincodeInvalid'));

export const requiredRule = (t: Translate, key: string, max: number) =>
  z.string().trim().min(1, t(key)).max(max, t('ecommStore.validation.tooLong'));

export const optionalRule = (t: Translate, max: number) =>
  z.string().trim().max(max, t('ecommStore.validation.tooLong'));
