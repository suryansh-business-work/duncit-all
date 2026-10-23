import { z } from 'zod';
import { BANK_PAYOUT_METHODS, POSTAL_CODE_PATTERN, zodRules } from '@duncit/forms';
import { BANK_ACCOUNT_NUMBER, IFSC, UPI_ID } from '@duncit/regex';
import { duplicateCategoryRows, isCompleteCategory, type AdminCategoryValue } from '@duncit/category';
import { fallbackT, type Translate } from '@duncit/shell';
import {
  foodLicencesShape,
  foodMenuShape,
  foodOrderingShape,
  foodTablesShape,
  makeFoodRefinement,
} from './register-venue.food-schema';
import {
  NO_CATEGORY_LIMIT,
  NO_FOOD_LIMITS,
  type FoodLimits,
  type RegisterVenueValues,
  type TaxDocTypes,
  type VenueSectionKey,
} from './register-venue.types';

const NO_TAX_DOCS: TaxDocTypes = { has_gstin: '', has_pan: '' };

const PAN_PATTERN = /^[A-Z]{5}\d{4}[A-Z]$/;
const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/;
const OWNER_PHONE_PATTERN = /^\+?\d{6,15}$/;
/** Bank account holder name — letters and single spaces between words only
 * (no digits/punctuation), per the Payout Method step's spec. */
const ACCOUNT_HOLDER_NAME_PATTERN = /^[A-Za-z]+(?: [A-Za-z]+)*$/;

const capacityItemSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, 'Give this capacity a label (e.g. Banquet hall)')
    .max(80, 'Capacity label must be 80 characters or fewer'),
  capacity: z.coerce
    .number({ error: 'Capacity must be a number' })
    .int('Capacity must be a whole number')
    .min(1, 'Capacity must be at least 1')
    .max(100_000, 'Capacity is unrealistic'),
});

const documentSchema = z.object({
  type: z.string().trim().min(1, 'Document type is required'),
  url: z.string().trim().min(1, 'Upload the document file'),
  hash: z.string().optional(),
});

/** DocumentsSection already blocks a duplicate at pick time (comparing file
 * hashes); this is the submit-time safety net so the same document can never
 * reach the server twice — under the same heading or a different one. */
const noDuplicateDocuments = (documents: z.infer<typeof documentSchema>[], ctx: z.RefinementCtx) => {
  const seen = new Set<string>();
  documents.forEach((doc, index) => {
    if (!doc.hash) return;
    if (seen.has(doc.hash)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, 'url'],
        message: 'This document is already uploaded under another heading',
      });
    }
    seen.add(doc.hash);
  });
};

const venueCategorySchema = z.object({
  super_id: z.string(),
  super_name: z.string(),
  category_id: z.string(),
  category_name: z.string(),
  sub_id: z.string(),
  sub_name: z.string(),
});

/** Each row is one whole Super → Category → Sub, and no sub category twice —
 * the server drops a repeat silently, so it is refused here where the owner
 * can see which row it is. Issues sit on the row, which is where the picker
 * shows them. */
const checkVenueCategories = (t: Translate) => (rows: AdminCategoryValue[], ctx: z.RefinementCtx) => {
  const duplicates = duplicateCategoryRows(rows);
  rows.forEach((row, index) => {
    if (!isCompleteCategory(row)) {
      ctx.addIssue({ code: 'custom', path: [index], message: t('partners.registerVenuePage.categoryIncomplete') });
    } else if (duplicates.has(index)) {
      ctx.addIssue({ code: 'custom', path: [index], message: t('partners.registerVenuePage.categoryDuplicate') });
    }
  });
};

/** "At most N categories" — the list's own error past the cap, and the note under a full list. */
export const categoryLimitMessage = (t: Translate, limit: number) =>
  limit === 1
    ? t('partners.registerVenuePage.categoryLimitOne')
    : t('partners.registerVenuePage.categoryLimitMany', { vars: { max: limit } });

/** An optional tax id: required, and checked against its format, only while
 * its switch says the venue has one. Returns the message to show, or null. */
const taxIdIssue = (
  has: boolean,
  value: string,
  pattern: RegExp,
  messages: Readonly<{ required: string; format: string }>,
) => {
  if (!has) return null;
  if (!value) return messages.required;
  return pattern.test(value.toUpperCase()) ? null : messages.format;
};

/** The switched-on tax ids whose proof document is not uploaded yet. */
const missingTaxDocuments = (
  values: Pick<RegisterVenueValues, 'has_gstin' | 'has_pan' | 'documents'>,
  taxDocTypes: TaxDocTypes,
) =>
  (['has_gstin', 'has_pan'] as const).filter((toggle) => {
    const type = taxDocTypes[toggle];
    return values[toggle] && type && !values.documents.some((doc) => doc.type === type && doc.url);
  });

/** Payout Method's and the tax documents' messages depend on the reader's
 * language (`t` from the form that renders it); every other field here is
 * pre-existing, unlocalized debt this change does not touch. `taxDocTypes`
 * names the document each GSTIN / PAN switch requires while it is on;
 * `foodLimits` are the config's caps for the food menu and its ordering;
 * `categoryLimit` is the config's cap on the venue's categories.
 *
 * `scope`: `'registration'` (the venue form) leaves the venue's type,
 * capacity and food to Venue Options — they are not asked for there, so they
 * cannot hold the application back; `'setup'` (the Venue Options pages that
 * edit them) requires them as before. */
export type VenueSchemaScope = 'registration' | 'setup';

export const registerVenueSchema = (
  t: Translate = fallbackT,
  taxDocTypes: TaxDocTypes = NO_TAX_DOCS,
  foodLimits: FoodLimits = NO_FOOD_LIMITS,
  categoryLimit: number = NO_CATEGORY_LIMIT,
  scope: VenueSchemaScope = 'registration',
) => z.object({
  venue_name: zodRules.requiredText('Venue name', 2, 120),
  description: z
    .string()
    .trim()
    .min(1, 'Venue description is required')
    .max(2000, 'Description must be 2000 characters or fewer'),
  cover_image_url: z.string().trim().min(1, 'Upload a cover image').max(1000),
  gallery: z.array(z.string().trim().max(1000)),
  // Each entry comes from the shared video field (an upload, or a link it checked); the server checks again.
  videos: z.array(z.string().trim().max(2048)),
  venue_categories: z
    .array(venueCategorySchema)
    .min(1, t('partners.registerVenuePage.categoryRequired'))
    .max(categoryLimit, categoryLimitMessage(t, categoryLimit))
    .superRefine(checkVenueCategories(t)),
  address_line1: zodRules.requiredText('Address line 1', 3, 200),
  address_line2: z.string().trim().max(200),
  location_id: z.string().trim().min(1, 'Select a city from available locations'),
  country: z.string().trim().min(1, 'Country is required'),
  country_code: z.string().trim().max(3, 'Country code must be 3 characters or fewer'),
  state: z.string().trim().min(1, 'State is required'),
  state_code: z.string().trim().max(10),
  city: z.string().trim().min(1, 'City is required'),
  locality: z.string().trim().min(1, 'Locality / area is required'),
  postal_code: z
    .string()
    .trim()
    .regex(POSTAL_CODE_PATTERN, 'Enter a valid PIN code (3–12 alphanumerics)'),
  venue_type: scope === 'setup' ? z.string().trim().min(1, 'Select a venue type') : z.string(),
  capacity_items:
    scope === 'setup'
      ? z.array(capacityItemSchema).min(1, 'Add at least one capacity entry for your venue')
      : z.array(capacityItemSchema),
  offers_food: z.boolean(),
  food_menu: foodMenuShape,
  food_ordering: foodOrderingShape,
  food_licences: foodLicencesShape,
  food_tables: foodTablesShape,
  food_gstin: z.string(),
  amenities: z.array(z.string().trim()),
  facilities: z.array(z.string().trim()),
  security: z.array(z.string().trim()),
  documents: z.array(documentSchema).min(1, 'Upload at least one document').superRefine(noDuplicateDocuments),
  has_gstin: z.boolean(),
  gstin: z.string().trim(),
  has_pan: z.boolean(),
  pan: z.string().trim(),
  owner_name: zodRules.personName('Owner name'),
  owner_email: zodRules.email('Owner email', { lengthFirst: true }),
  owner_phone: z
    .string()
    .trim()
    .regex(OWNER_PHONE_PATTERN, 'Owner phone must contain only digits (6–15 digits) with optional + prefix'),
  owner_dob: z
    .string()
    .trim()
    .min(1, 'Owner DOB is required')
    .refine((value) => {
      if (!value) return true;
      const date = new Date(value);
      return !Number.isNaN(date.getTime()) && date <= new Date();
    }, 'Enter a valid date of birth'),
  owner_address: z
    .string()
    .trim()
    .min(1, 'Owner address is required')
    .max(500, 'Address must be 500 characters or fewer'),
  payout_method: z
    .string()
    .trim()
    .min(1, t('partners.registerVenuePage.payoutMethodRequired'))
    .refine(
      (value) => (BANK_PAYOUT_METHODS as readonly string[]).includes(value),
      t('partners.registerVenuePage.payoutMethodInvalid')
    ),
  account_holder_name: z
    .string()
    .trim()
    .min(1, t('partners.registerVenuePage.accountHolderNameRequired'))
    .regex(ACCOUNT_HOLDER_NAME_PATTERN, t('partners.registerVenuePage.accountHolderNameInvalid')),
  account_number: z.string().trim(),
  ifsc_code: z.string().trim(),
  upi_id: z.string().trim(),
})
  .superRefine((values, ctx) => {
    if (scope === 'setup') makeFoodRefinement(t, foodLimits)(values, ctx);
  })
  // Which payout fields are required depends on the selected method, so this
  // is a superRefine rather than per-field .min() — RHF keeps every payout
  // field registered while the reader switches the Payout Method dropdown.
  .superRefine((values, ctx) => {
    const gstinIssue = taxIdIssue(values.has_gstin, values.gstin, GSTIN_PATTERN, {
      required: 'GSTIN is required',
      format: 'GSTIN must follow format like 22ABCDE1234F1Z5',
    });
    if (gstinIssue) ctx.addIssue({ code: 'custom', path: ['gstin'], message: gstinIssue });
    const panIssue = taxIdIssue(values.has_pan, values.pan, PAN_PATTERN, {
      required: 'PAN is required',
      format: 'PAN must follow format ABCDE1234F',
    });
    if (panIssue) ctx.addIssue({ code: 'custom', path: ['pan'], message: panIssue });
    for (const toggle of missingTaxDocuments(values, taxDocTypes)) {
      ctx.addIssue({
        code: 'custom',
        path: [toggle],
        message: t('partners.registerVenuePage.taxDocumentRequired', { vars: { type: taxDocTypes[toggle] } }),
      });
    }
    if (values.payout_method === 'UPI') {
      if (!values.upi_id) {
        ctx.addIssue({ code: 'custom', path: ['upi_id'], message: t('partners.registerVenuePage.upiIdRequired') });
      } else if (!UPI_ID.test(values.upi_id)) {
        ctx.addIssue({ code: 'custom', path: ['upi_id'], message: t('partners.registerVenuePage.upiIdInvalid') });
      }
      return;
    }
    if (values.payout_method === 'IMPS' || values.payout_method === 'NEFT') {
      if (!values.account_number) {
        ctx.addIssue({
          code: 'custom',
          path: ['account_number'],
          message: t('partners.registerVenuePage.accountNumberRequired'),
        });
      } else if (!BANK_ACCOUNT_NUMBER.test(values.account_number)) {
        ctx.addIssue({
          code: 'custom',
          path: ['account_number'],
          message: t('partners.registerVenuePage.accountNumberInvalid'),
        });
      }
      if (!values.ifsc_code) {
        ctx.addIssue({ code: 'custom', path: ['ifsc_code'], message: t('partners.registerVenuePage.ifscCodeRequired') });
      } else if (!IFSC.test(values.ifsc_code.toUpperCase())) {
        ctx.addIssue({
          code: 'custom',
          path: ['ifsc_code'],
          message: t('partners.registerVenuePage.ifscCodeInvalid'),
        });
      }
    }
  });

/** Fields validated (and shown as incomplete in the rail) per section.
 * 'review' has no fields; 'leaves' persists via venue settings, not this form. */
export const SECTION_FIELDS: Record<Exclude<VenueSectionKey, 'review' | 'leaves'>, (keyof RegisterVenueValues)[]> = {
  details: [
    'venue_name',
    'description',
    'cover_image_url',
    'gallery',
    'videos',
    'venue_categories',
    'address_line1',
    'address_line2',
    'location_id',
    'country',
    'country_code',
    'state',
    'state_code',
    'city',
    'locality',
    'postal_code',
  ],
  'type-capacity': ['venue_type', 'capacity_items'],
  food: ['offers_food', 'food_menu', 'food_ordering', 'food_licences', 'food_tables', 'food_gstin'],
  amenities: ['amenities', 'facilities', 'security'],
  documents: ['documents', 'has_gstin', 'gstin', 'has_pan', 'pan'],
  owner: ['owner_name', 'owner_email', 'owner_phone', 'owner_dob', 'owner_address'],
  payout: ['payout_method', 'account_holder_name', 'account_number', 'ifsc_code', 'upi_id'],
};
