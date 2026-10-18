import { z } from 'zod';
import { DIGITS } from '@duncit/regex';
import type { GigCategoryFormValues, GigCategoryRow } from './gig-category.types';

type Translate = (key: string, options?: { vars?: Record<string, string | number> }) => string;

/** The server's bounds (gigJob.validator.ts GIG_LIMITS). */
const TITLE_MAX = 80;
const DESCRIPTION_MAX = 300;
const ROLE_MAX = 60;
const ROLES_MAX = 30;

/** One role per line, blanks and repeats dropped. */
export const rolesOf = (text: string): string[] =>
  Array.from(new Set(text.split('\n').map((line) => line.trim()).filter(Boolean)));

export function makeGigCategorySchema(t: Translate) {
  return z.object({
    title: z
      .string()
      .trim()
      .min(2, t('gigJobs.validation.nameRequired'))
      .max(TITLE_MAX, t('gigJobs.validation.tooLong', { vars: { max: TITLE_MAX } })),
    description: z
      .string()
      .trim()
      .max(DESCRIPTION_MAX, t('gigJobs.validation.tooLong', { vars: { max: DESCRIPTION_MAX } })),
    examples: z
      .string()
      .refine((text) => rolesOf(text).length > 0, t('gigJobs.validation.rolesRequired'))
      .refine((text) => rolesOf(text).length <= ROLES_MAX, t('gigJobs.validation.rolesTooMany', { vars: { max: ROLES_MAX } }))
      .refine((text) => rolesOf(text).every((role) => role.length <= ROLE_MAX), t('gigJobs.validation.tooLong', { vars: { max: ROLE_MAX } })),
    sort_order: z.string().trim().refine((value) => DIGITS.test(value), t('gigJobs.validation.sortOrderInvalid')),
    is_active: z.boolean(),
  });
}

export const gigCategoryDefaults: GigCategoryFormValues = {
  title: '',
  description: '',
  examples: '',
  sort_order: '0',
  is_active: true,
};

export const gigCategoryToValues = (row: GigCategoryRow | null): GigCategoryFormValues =>
  row
    ? {
        title: row.title,
        description: row.description,
        examples: row.examples.join('\n'),
        sort_order: String(row.sort_order),
        is_active: row.is_active,
      }
    : gigCategoryDefaults;

export const toGigCategoryInput = (values: GigCategoryFormValues) => ({
  title: values.title.trim(),
  description: values.description.trim(),
  examples: rolesOf(values.examples),
  sort_order: Number(values.sort_order),
  is_active: values.is_active,
});
