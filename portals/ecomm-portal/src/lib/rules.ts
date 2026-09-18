import { z } from 'zod';
import { PUBLIC_URL_PATTERN } from '@duncit/forms';
import type { Translate } from './translate';

const AMOUNT = /^\d+(\.\d{1,2})?$/;
const WHOLE = /^\d+$/;

/** Blank, or a link — absolute, or a path on the store itself. */
const isLink = (value: string) => value === '' || value.startsWith('/') || PUBLIC_URL_PATTERN.test(value);
const isEmail = (value: string) => value === '' || z.email().safeParse(value).success;

/**
 * The field rules every form in this console is built from. Built per reader,
 * because every message is copy (rule 38): a schema is made inside the form
 * with the reader's `t`, never frozen at module load.
 *
 * Numbers stay text while they are typed — an MUI number box submits a string —
 * and are checked as text here, then converted once on submit.
 */
export function makeRules(t: Translate) {
  const tooLong = (max: number) => t('ecommPortal.form.tooLong', { vars: { max } });
  const amountRule = (value: string) => value === '' || AMOUNT.test(value);
  const wholeRule = (value: string) => value === '' || WHOLE.test(value);
  const requiredText = (max: number) =>
    z.string().trim().min(1, t('ecommPortal.form.required')).max(max, tooLong(max));
  const optionalText = (max: number) => z.string().trim().max(max, tooLong(max));
  return {
    requiredText,
    optionalText,
    /** Name, URL key and description — the shape `IdentityFields` edits. */
    identity: () => ({ name: requiredText(80), slug: optionalText(80), description: optionalText(1000) }),
    /** What a search result shows — the shape `SeoFields` edits. */
    seo: () => ({ seo_title: optionalText(120), seo_description: optionalText(320) }),
    link: () => z.string().trim().refine(isLink, t('ecommPortal.form.invalidLink')),
    /** A required absolute http(s) address — a social profile, say. */
    webUrl: () => z.string().trim().regex(PUBLIC_URL_PATTERN, t('ecommPortal.form.invalidUrl')),
    email: () => z.string().trim().refine(isEmail, t('ecommPortal.form.invalidEmail')),
    amount: () => z.string().trim().refine(amountRule, t('ecommPortal.form.amount')),
    whole: () => z.string().trim().refine(wholeRule, t('ecommPortal.form.whole')),
    percent: (max: number) =>
      z
        .string()
        .trim()
        .refine((value) => amountRule(value) && Number(value || 0) <= max, t('ecommPortal.form.percent', { vars: { max } })),
    ids: () => z.array(z.string()),
    lines: () => z.array(z.string().trim()),
  };
}

export type Rules = ReturnType<typeof makeRules>;
