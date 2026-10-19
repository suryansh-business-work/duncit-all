import { z } from 'zod';
import { DIGITS, EMAIL, PHONE_INTL_PLUS } from '@duncit/regex';

import type { Translate } from './translate';

/**
 * Gig Jobs forms — the post (host / venue owner / brand owner), the
 * freelancer profile (Earn with Duncit) and the "I'm interested" note. One set
 * of rules for mWeb, the Partners console and the native app. The bounds are
 * the server's (`gigJob.validator.ts` GIG_LIMITS) — change both together.
 * Numbers stay strings here because that is what a text box holds.
 */
export const GIG_LIMITS = {
  titleMin: 3,
  titleMax: 120,
  descriptionMax: 2000,
  rolesMax: 10,
  localityMax: 120,
  locationMax: 160,
  budgetMax: 10_000_000,
  openingsMax: 100,
  nameMin: 2,
  nameMax: 80,
  messageMax: 500,
  bioMax: 1000,
  categoriesMax: 5,
  skillsMax: 15,
  experienceMax: 60,
} as const;

const wholeNumberIn = (min: number, max: number) => (value: string) =>
  DIGITS.test(value) && Number(value) >= min && Number(value) <= max;

const isHttpLink = (value: string) => z.url({ protocol: /^https?$/ }).safeParse(value).success;

/**
 * Where: a city picked from the admin Location list (its id) and, optionally,
 * one of its areas. The server checks the Location and fills the city's name.
 */
function placeRules(t: Translate) {
  return {
    location_id: z.string().trim().min(1, t('gigJobs.validation.cityRequired')),
    locality: z
      .string()
      .trim()
      .max(GIG_LIMITS.localityMax, t('gigJobs.validation.tooLong', { vars: { max: GIG_LIMITS.localityMax } })),
  };
}

function contactRules(t: Translate) {
  return {
    contact_phone: z
      .string()
      .trim()
      .min(1, t('gigJobs.validation.phoneRequired'))
      .refine(
        (value) => value === '' || PHONE_INTL_PLUS.test(value.replace(/[\s-]/g, '')),
        t('gigJobs.validation.phoneInvalid'),
      ),
    contact_email: z
      .string()
      .trim()
      .refine((value) => value === '' || EMAIL.test(value), t('gigJobs.validation.emailInvalid')),
  };
}

export function makeGigJobSchema(t: Translate) {
  return z.object({
    poster_role: z
      .string()
      .refine((value) => ['HOST', 'VENUE_OWNER', 'ECOMM_MANAGER'].includes(value), t('gigJobs.validation.posterRoleRequired')),
    category_id: z.string().min(1, t('gigJobs.validation.categoryRequired')),
    title: z
      .string()
      .trim()
      .min(GIG_LIMITS.titleMin, t('gigJobs.validation.titleLength', { vars: { min: GIG_LIMITS.titleMin, max: GIG_LIMITS.titleMax } }))
      .max(GIG_LIMITS.titleMax, t('gigJobs.validation.titleLength', { vars: { min: GIG_LIMITS.titleMin, max: GIG_LIMITS.titleMax } })),
    description: z
      .string()
      .trim()
      .max(GIG_LIMITS.descriptionMax, t('gigJobs.validation.tooLong', { vars: { max: GIG_LIMITS.descriptionMax } })),
    roles: z
      .array(z.string())
      .min(1, t('gigJobs.validation.rolesRequired'))
      .max(GIG_LIMITS.rolesMax, t('gigJobs.validation.rolesTooMany', { vars: { max: GIG_LIMITS.rolesMax } })),
    event_type: z.enum(['EVENT', 'WORKSHOP', 'OTHER']),
    event_date: z
      .string()
      .refine((value) => value === '' || !Number.isNaN(Date.parse(value)), t('gigJobs.validation.dateInvalid')),
    ...placeRules(t),
    location: z
      .string()
      .trim()
      .max(GIG_LIMITS.locationMax, t('gigJobs.validation.tooLong', { vars: { max: GIG_LIMITS.locationMax } })),
    budget: z
      .string()
      .trim()
      .refine(
        (value) => value === '' || wholeNumberIn(0, GIG_LIMITS.budgetMax)(value),
        t('gigJobs.validation.budgetInvalid', { vars: { max: GIG_LIMITS.budgetMax } }),
      ),
    openings: z
      .string()
      .trim()
      .refine(wholeNumberIn(1, GIG_LIMITS.openingsMax), t('gigJobs.validation.openingsInvalid', { vars: { max: GIG_LIMITS.openingsMax } })),
    contact_name: z
      .string()
      .trim()
      .min(GIG_LIMITS.nameMin, t('gigJobs.validation.nameRequired'))
      .max(GIG_LIMITS.nameMax, t('gigJobs.validation.tooLong', { vars: { max: GIG_LIMITS.nameMax } })),
    ...contactRules(t),
  });
}

export type GigJobSchemaValues = z.infer<ReturnType<typeof makeGigJobSchema>>;

export function makeFreelancerProfileSchema(t: Translate) {
  return z.object({
    display_name: z
      .string()
      .trim()
      .min(GIG_LIMITS.nameMin, t('gigJobs.validation.nameRequired'))
      .max(GIG_LIMITS.nameMax, t('gigJobs.validation.tooLong', { vars: { max: GIG_LIMITS.nameMax } })),
    category_ids: z
      .array(z.string())
      .min(1, t('gigJobs.validation.categoriesRequired'))
      .max(GIG_LIMITS.categoriesMax, t('gigJobs.validation.categoriesTooMany', { vars: { max: GIG_LIMITS.categoriesMax } })),
    skills: z
      .array(z.string())
      .min(1, t('gigJobs.validation.skillsRequired'))
      .max(GIG_LIMITS.skillsMax, t('gigJobs.validation.skillsTooMany', { vars: { max: GIG_LIMITS.skillsMax } })),
    ...placeRules(t),
    bio: z
      .string()
      .trim()
      .max(GIG_LIMITS.bioMax, t('gigJobs.validation.tooLong', { vars: { max: GIG_LIMITS.bioMax } })),
    portfolio_url: z
      .string()
      .trim()
      .refine((value) => value === '' || isHttpLink(value), t('gigJobs.validation.linkInvalid')),
    experience_years: z
      .string()
      .trim()
      .refine(
        (value) => value === '' || wholeNumberIn(0, GIG_LIMITS.experienceMax)(value),
        t('gigJobs.validation.experienceInvalid', { vars: { max: GIG_LIMITS.experienceMax } }),
      ),
    ...contactRules(t),
    is_available: z.boolean(),
  });
}

export type FreelancerProfileSchemaValues = z.infer<ReturnType<typeof makeFreelancerProfileSchema>>;

export function makeGigInterestSchema(t: Translate) {
  return z.object({
    message: z
      .string()
      .trim()
      .max(GIG_LIMITS.messageMax, t('gigJobs.validation.tooLong', { vars: { max: GIG_LIMITS.messageMax } })),
  });
}

export const gigInterestDefaults = { message: '' };
