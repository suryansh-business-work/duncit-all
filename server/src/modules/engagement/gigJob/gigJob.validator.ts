import { z } from 'zod';
import {
  arr,
  bool,
  email,
  filled,
  finite,
  gte,
  int,
  lowercase,
  lte,
  maxItems,
  maxLen,
  minItems,
  minLen,
  num,
  obj,
  shape,
  str,
  trim,
  url,
} from '@utils/zod-fields';
import { PHONE_NUMBER_REGEX } from '@utils/phone';
import { GIG_EVENT_TYPES, GIG_POSTER_ROLES } from './gigJob.model';

/**
 * The bounds every gig form shares. The client twin is `@duncit/forms/schemas`
 * `gig-job.ts` — change both together.
 */
export const GIG_LIMITS = {
  titleMax: 120,
  descriptionMax: 2000,
  rolesMax: 10,
  roleMax: 60,
  cityMax: 80,
  localityMax: 120,
  locationMax: 160,
  budgetMax: 10_000_000,
  openingsMax: 100,
  nameMax: 80,
  messageMax: 500,
  bioMax: 1000,
  categoriesMax: 5,
  skillsMax: 15,
  experienceMax: 60,
  examplesMax: 30,
  categoryDescriptionMax: 300,
} as const;

/** "+" optional, then 6–15 digits — the server's subscriber rule after the "+". */
const isContactPhone = (value: string) => PHONE_NUMBER_REGEX.test(value.replace(/^\+/, ''));

const isIsoDate = (value: string) => value === '' || !Number.isNaN(Date.parse(value));

/**
 * An optional field the GraphQL input declares nullable reads null as blank —
 * the clients send `event_date: null` for "no date yet", which used to fail as
 * "event_date cannot be null".
 */
const nullAsBlank = (value: unknown) => (value === null ? '' : value);

const text = (max: number, required?: string) =>
  required
    ? str(z.string().check(filled(required), maxLen(max)), { required, transforms: [trim] })
    : str(z.string().check(maxLen(max)), { transforms: [nullAsBlank, trim], default: '' });

const roleList = (max: number, message: string) =>
  arr(z.array(str(z.string().check(filled(), maxLen(GIG_LIMITS.roleMax)), { transforms: [trim] })).check(minItems(1, message), maxItems(max)));

const contactPhone = () =>
  str(z.string().check(filled('Contact phone is required')).refine(isContactPhone, 'Enter a valid phone number'), {
    required: 'Contact phone is required',
    transforms: [trim],
  });

/**
 * Where: the admin Location id plus one of its zones, or — from a client built
 * before the picker — only a typed city. One of the two is required; the
 * service checks the Location and fills `city` from it.
 */
const placeFields = () => ({
  location_id: str(z.string().check(maxLen(24)), { transforms: [nullAsBlank, trim], default: '' }),
  locality: text(GIG_LIMITS.localityMax),
  city: text(GIG_LIMITS.cityMax),
});

const PLACE_REQUIRED = {
  message: 'City is required',
  test: (value: Record<string, unknown>) => Boolean(value.location_id || value.city),
};

const contactEmail = () =>
  str(z.string().check(email('Enter a valid email'), maxLen(254)), { transforms: [trim, lowercase], default: '' });

export const gigJobInputSchema = obj(
  shape({
    poster_role: str(z.enum(GIG_POSTER_ROLES), { oneOf: GIG_POSTER_ROLES, required: 'Choose who you are posting as' }),
    category_id: str(z.string().check(filled('Choose a category')), { required: 'Choose a category', transforms: [trim] }),
    title: str(z.string().check(filled('Title is required'), minLen(3), maxLen(GIG_LIMITS.titleMax)), {
      required: 'Title is required',
      transforms: [trim],
    }),
    description: text(GIG_LIMITS.descriptionMax),
    roles: roleList(GIG_LIMITS.rolesMax, 'Pick at least one role'),
    event_type: str(z.enum(GIG_EVENT_TYPES), { oneOf: GIG_EVENT_TYPES, default: 'EVENT' }),
    event_date: str(z.string().refine(isIsoDate, 'Enter a valid date'), {
      transforms: [nullAsBlank, trim],
      default: '',
    }),
    ...placeFields(),
    location: text(GIG_LIMITS.locationMax),
    budget: num(finite().check(int(), gte(0), lte(GIG_LIMITS.budgetMax)).nullable(), { default: null }),
    openings: num(finite().check(int(), gte(1), lte(GIG_LIMITS.openingsMax)), { default: 1 }),
    contact_name: text(GIG_LIMITS.nameMax, 'Contact name is required'),
    contact_phone: contactPhone(),
    contact_email: contactEmail(),
  }, { tests: [PLACE_REQUIRED] })
);

export type GigJobInput = z.infer<typeof gigJobInputSchema>;

export const gigInterestInputSchema = obj(shape({ message: text(GIG_LIMITS.messageMax) }));

export const freelancerProfileInputSchema = obj(
  shape({
    display_name: str(z.string().check(filled('Name is required'), minLen(2), maxLen(GIG_LIMITS.nameMax)), {
      required: 'Name is required',
      transforms: [trim],
    }),
    category_ids: arr(
      z.array(str(z.string().check(filled()), { transforms: [trim] })).check(minItems(1, 'Pick at least one category'), maxItems(GIG_LIMITS.categoriesMax))
    ),
    skills: roleList(GIG_LIMITS.skillsMax, 'Pick at least one skill'),
    ...placeFields(),
    bio: text(GIG_LIMITS.bioMax),
    portfolio_url: str(z.string().check(url('Enter a valid link'), maxLen(1000)), { transforms: [trim], default: '' }),
    experience_years: num(finite().check(int(), gte(0), lte(GIG_LIMITS.experienceMax)), { default: 0 }),
    contact_phone: contactPhone(),
    contact_email: contactEmail(),
    is_available: bool(z.boolean(), { default: true }),
  }, { tests: [PLACE_REQUIRED] })
);

export type FreelancerProfileInput = z.infer<typeof freelancerProfileInputSchema>;

export const gigCategoryInputSchema = obj(
  shape({
    title: str(z.string().check(filled('Title is required'), minLen(2), maxLen(GIG_LIMITS.nameMax)), {
      required: 'Title is required',
      transforms: [trim],
    }),
    description: text(GIG_LIMITS.categoryDescriptionMax),
    examples: roleList(GIG_LIMITS.examplesMax, 'Add at least one example role'),
    sort_order: num(finite().check(int(), gte(0), lte(100_000)), { default: 0 }),
    is_active: bool(z.boolean(), { default: true }),
  })
);

export type GigCategoryInput = z.infer<typeof gigCategoryInputSchema>;
