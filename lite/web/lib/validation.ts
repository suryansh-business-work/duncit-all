import { z } from 'zod';
import { EMAIL, OTP_6, PHONE_INTL_PLUS, SOCIAL_HANDLE, UPI_ID, URL_SLUG, toDigits } from '@duncit/regex';
import { countIssue, type CountRange } from '../../shared/limits';

export type { CountRange };

export type Translate = (key: string, options?: { vars?: Record<string, string | number>; count?: number }) => string;

const HANDLE = /^[a-z0-9](?:[a-z0-9_]{1,28}[a-z0-9])?$/;

/** A full http(s) link, checked by the URL parser rather than a pattern. */
export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * The one message a number box shows, so every form reads the same: not a
 * whole number, negative, below the minimum, or above the maximum.
 */
export function countProblem(raw: string, range: CountRange, t: Translate): string | null {
  switch (countIssue(raw, range)) {
    case 'negative':
      return t('liteWeb.validation.negative');
    case 'notWhole':
      return t('liteWeb.validation.numberInvalid');
    case 'belowMin':
      return t('liteWeb.validation.atLeast', { vars: { min: range.min } });
    case 'aboveMax':
      return t('liteWeb.validation.atMost', { vars: { max: range.max } });
    default:
      return null;
  }
}

/** A whole number in [min, max], typed into a text box. */
const countRule = (t: Translate, range: CountRange, allowBlank: boolean) =>
  z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (allowBlank && value === '') return;
      const problem = countProblem(value, range, t);
      if (problem) ctx.addIssue({ code: 'custom', message: problem });
    });

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
  /** A phone number: national digits, or a full number starting with +. */
  phone: (t: Translate) =>
    z
      .string()
      .trim()
      .refine((value) => PHONE_INTL_PLUS.test(value.replaceAll(/[\s()-]/g, '')) && toDigits(value).length >= 8, t('liteWeb.validation.phoneInvalid')),
  code: (t: Translate) => z.string().trim().refine((value) => OTP_6.test(value), t('liteWeb.validation.codeInvalid')),
  required: (t: Translate, max: number) =>
    z.string().trim().min(1, t('liteWeb.validation.required')).max(max, t('liteWeb.validation.tooLong', { vars: { max } })),
  optional: (t: Translate, max: number) => z.string().trim().max(max, t('liteWeb.validation.tooLong', { vars: { max } })),
  optionalUrl: (t: Translate) =>
    z
      .string()
      .trim()
      .max(2048, t('liteWeb.validation.tooLong', { vars: { max: 2048 } }))
      .refine((value) => value === '' || isHttpUrl(value), t('liteWeb.validation.urlInvalid')),
  optionalUpi: (t: Translate) =>
    z
      .string()
      .trim()
      .toLowerCase()
      .refine((value) => value === '' || UPI_ID.test(value), t('liteWeb.validation.upiInvalid')),
  handle: (t: Translate) => z.string().trim().toLowerCase().refine((value) => HANDLE.test(value), t('liteWeb.validation.handleInvalid')),
  /** A social handle with or without the leading @; a pasted link is refused. */
  socialHandle: (t: Translate) =>
    z
      .string()
      .trim()
      .transform((value) => value.replace(/^@/, ''))
      .refine((value) => value === '' || SOCIAL_HANDLE.test(value), t('liteWeb.validation.socialInvalid')),
  /** An event's public link: 3–80 lowercase letters, numbers and single hyphens. */
  slug: (t: Translate) =>
    z
      .string()
      .trim()
      .toLowerCase()
      .refine((value) => value.length >= 3 && value.length <= 80 && URL_SLUG.test(value), t('liteWeb.validation.slugInvalid')),
  /** A whole number in [min, max]; negatives, decimals and anything else are refused with their own message. */
  count: (t: Translate, range: CountRange) => countRule(t, range, false),
  /** `count`, where a blank box means "no limit". */
  countOrBlank: (t: Translate, range: CountRange) => countRule(t, range, true),
};

/** A blank text box as the API's null. */
export const blankToNull = (value: string): string | null => (value.trim() === '' ? null : value.trim());

/** A digits-only box as a number, blank as null. */
export const digitsToNumber = (value: string): number | null => (value.trim() === '' ? null : Number.parseInt(value, 10));
