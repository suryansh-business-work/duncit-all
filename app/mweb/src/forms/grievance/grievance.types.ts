import { z } from 'zod';
import { EMAIL, PHONE_INTL_PLUS } from '@duncit/regex';
import { EMPTY_GRIEVANCE_DRAFT, GRIEVANCE_MAX_LENGTH, type GrievanceDraft } from '@duncit/utils';

/**
 * The translator, as @duncit/i18n actually shapes it.
 *
 * Placeholders are substituted from `options.vars` — NOT from a bare second
 * argument. Passing the vars object directly type-checks against a looser
 * signature and then renders `{field}` verbatim in the sentence, which is a
 * mistake only a running form shows you.
 */
export type GrievanceTranslate = (
  key: string,
  options?: { vars?: Record<string, string> },
) => string;

export type GrievanceValues = GrievanceDraft;

export const grievanceDefaults: GrievanceValues = { ...EMPTY_GRIEVANCE_DRAFT };

/** Digits only, after stripping the punctuation people actually type. */
export const phoneDigits = (value: string): string => value.replace(/[\s()-]/g, '');

/**
 * The grievance form's rules, built from the shared spec.
 *
 * Every limit comes from `GRIEVANCE_MAX_LENGTH` and every shape from
 * `@duncit/regex`, so mWeb, native and the server accept exactly the same
 * input — the native twin of this file reads the same two sources, which is
 * what stops the pair drifting (rule 27). Messages are localization keys
 * resolved by the caller's `t`, so the two surfaces also say the same thing.
 */
export function buildGrievanceSchema(t: GrievanceTranslate) {
  const required = (field: string) => t('grievance.errorRequired', { vars: { field } });
  const tooLong = (field: string) => t('grievance.errorTooLong', { vars: { field } });
  const label = (key: string) => t(`grievance.field.${key}`);

  return z.object({
    name: z
      .string()
      .trim()
      .min(1, required(label('name')))
      .max(GRIEVANCE_MAX_LENGTH.name, tooLong(label('name'))),
    email: z
      .string()
      .trim()
      .min(1, required(label('email')))
      .max(GRIEVANCE_MAX_LENGTH.email, tooLong(label('email')))
      .refine((v) => EMAIL.test(v), t('grievance.errorEmail')),
    phone: z
      .string()
      .trim()
      .min(1, required(label('phone')))
      .max(GRIEVANCE_MAX_LENGTH.phone, tooLong(label('phone')))
      .refine((v) => PHONE_INTL_PLUS.test(phoneDigits(v)), t('grievance.errorPhone')),
    // The one optional field.
    address: z.string().trim().max(GRIEVANCE_MAX_LENGTH.address, tooLong(label('address'))),
    subject: z
      .string()
      .trim()
      .min(1, required(label('subject')))
      .max(GRIEVANCE_MAX_LENGTH.subject, tooLong(label('subject'))),
    description: z
      .string()
      .trim()
      .min(1, required(label('description')))
      .max(GRIEVANCE_MAX_LENGTH.description, tooLong(label('description'))),
  });
}
