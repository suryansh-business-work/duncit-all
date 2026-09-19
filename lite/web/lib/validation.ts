import { z } from 'zod';
import { EMAIL, OTP_6, UPI_ID } from '@duncit/regex';

export type Translate = (key: string, options?: { vars?: Record<string, string | number>; count?: number }) => string;

const HANDLE = /^[a-z0-9](?:[a-z0-9_]{1,28}[a-z0-9])?$/;
const HTTP_URL = /^https?:\/\/\S+$/i;
const DIGITS = /^\d+$/;
const DIGITS_OR_BLANK = /^\d*$/;

/** The rules every Lite form shares, each with its message in the reader's language. */
export const rules = {
  email: (t: Translate) =>
    z
      .string()
      .trim()
      .toLowerCase()
      .min(1, t('liteWeb.validation.required'))
      .max(254, t('liteWeb.validation.tooLong', { vars: { max: 254 } }))
      .refine((value) => EMAIL.test(value), t('liteWeb.validation.emailInvalid')),
  code: (t: Translate) => z.string().trim().refine((value) => OTP_6.test(value), t('liteWeb.validation.codeInvalid')),
  required: (t: Translate, max: number) =>
    z.string().trim().min(1, t('liteWeb.validation.required')).max(max, t('liteWeb.validation.tooLong', { vars: { max } })),
  optional: (t: Translate, max: number) => z.string().trim().max(max, t('liteWeb.validation.tooLong', { vars: { max } })),
  optionalUrl: (t: Translate) =>
    z
      .string()
      .trim()
      .max(2048, t('liteWeb.validation.tooLong', { vars: { max: 2048 } }))
      .refine((value) => value === '' || HTTP_URL.test(value), t('liteWeb.validation.urlInvalid')),
  optionalUpi: (t: Translate) =>
    z
      .string()
      .trim()
      .toLowerCase()
      .refine((value) => value === '' || UPI_ID.test(value), t('liteWeb.validation.upiInvalid')),
  handle: (t: Translate) => z.string().trim().toLowerCase().refine((value) => HANDLE.test(value), t('liteWeb.validation.handleInvalid')),
  wholeNumber: (t: Translate) => z.string().trim().refine((value) => DIGITS.test(value), t('liteWeb.validation.numberInvalid')),
  wholeNumberOrBlank: (t: Translate) => z.string().trim().refine((value) => DIGITS_OR_BLANK.test(value), t('liteWeb.validation.numberInvalid')),
};

/** A blank text box as the API's null. */
export const blankToNull = (value: string): string | null => (value.trim() === '' ? null : value.trim());

/** A digits-only box as a number, blank as null. */
export const digitsToNumber = (value: string): number | null => (value.trim() === '' ? null : Number.parseInt(value, 10));
