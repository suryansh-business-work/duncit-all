import { z } from 'zod';
import {
  GSTIN_PATTERN,
  PAN_PATTERN,
  PHONE_NUMBER_PATTERN,
  POSTAL_CODE_PATTERN,
  zodRules,
} from '@duncit/forms';

const YEAR_PATTERN = /^\d{4}$/;
const ACCOUNT_NUMBER_PATTERN = /^\d{6,20}$/;
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z\d]{6}$/;
const COMMISSION_PATTERN = /^\d{1,3}(\.\d{1,2})?$/;

/** The server caps `product_categories` at 30 entries (applyInput slice(0, 30)). */
export const MAX_PRODUCT_CATEGORIES = 30;

/** Splits the comma-separated categories field into the array the server stores. */
export const parseCategories = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

/** Optional field: blank passes, otherwise it must match the pattern. */
const blankOr = (pattern: RegExp, message: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === '' || pattern.test(value), message);

/** Same as `blankOr`, but normalises to upper case first (GSTIN / PAN / IFSC). */
const blankOrUpper = (pattern: RegExp, message: string) =>
  z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => value === '' || pattern.test(value), message);

/**
 * Mirrors the server `EcommBrandInput` — every field is optional there, so only
 * `brand_name` is required here. Commission, active state and status are NOT
 * part of this form: they have their own mutations (and status changes belong to
 * Brands Review, never to Catalog).
 */
export const brandSchema = z.object({
  brand_name: zodRules.requiredText('Brand name', 2, 80),
  tagline: zodRules.optionalText('Tagline', 120),
  description: zodRules.optionalText('Description', 2000),
  product_categories: z
    .string()
    .trim()
    .refine(
      (value) => parseCategories(value).length <= MAX_PRODUCT_CATEGORIES,
      `Up to ${MAX_PRODUCT_CATEGORIES} categories`,
    ),
  logo_url: zodRules.optionalUrl('Logo URL'),
  cover_image_url: zodRules.optionalUrl('Cover image URL'),
  website_url: zodRules.optionalUrl('Website URL'),
  instagram_url: zodRules.optionalUrl('Instagram URL'),
  contact_person: zodRules.optionalText('Contact person', 80),
  contact_email: zodRules.optionalEmail('Contact email'),
  contact_phone: blankOr(PHONE_NUMBER_PATTERN, 'Contact phone must be 6-15 digits'),
  registered_business_name: zodRules.optionalText('Registered business name', 120),
  gstin: blankOrUpper(GSTIN_PATTERN, 'Enter a valid 15-character GSTIN'),
  pan: blankOrUpper(PAN_PATTERN, 'Enter a valid PAN, e.g. ABCDE1234F'),
  established_year: blankOr(YEAR_PATTERN, 'Established year must be a 4-digit year'),
  address_line1: zodRules.optionalText('Address line 1', 120),
  city: zodRules.optionalText('City', 60),
  state: zodRules.optionalText('State', 60),
  postal_code: blankOr(POSTAL_CODE_PATTERN, 'Enter a valid postal code'),
  country: zodRules.optionalText('Country', 60),
  account_holder_name: zodRules.optionalText('Account holder name', 80),
  account_number: blankOr(ACCOUNT_NUMBER_PATTERN, 'Account number must be 6-20 digits'),
  ifsc_code: blankOrUpper(IFSC_PATTERN, 'Enter a valid IFSC code, e.g. HDFC0000001'),
  upi_id: zodRules.optionalText('UPI ID', 80),
});

export type BrandFormValues = z.infer<typeof brandSchema>;

/** Duncit's commission cut on this brand's product sales (0 = inherit). */
export const brandCommissionSchema = z.object({
  product_commission_pct: z
    .string()
    .trim()
    .refine((value) => COMMISSION_PATTERN.test(value), 'Enter a percentage between 0 and 100')
    .refine((value) => Number(value) <= 100, 'Commission cannot exceed 100'),
});

export type BrandCommissionFormValues = z.infer<typeof brandCommissionSchema>;

export const brandInitialValues: BrandFormValues = {
  brand_name: '',
  tagline: '',
  description: '',
  product_categories: '',
  logo_url: '',
  cover_image_url: '',
  website_url: '',
  instagram_url: '',
  contact_person: '',
  contact_email: '',
  contact_phone: '',
  registered_business_name: '',
  gstin: '',
  pan: '',
  established_year: '',
  address_line1: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'India',
  account_holder_name: '',
  account_number: '',
  ifsc_code: '',
  upi_id: '',
};

const str = (value: unknown) => (value == null ? '' : String(value));

/** Seeds every field from the loaded brand so an untouched field round-trips unchanged. */
export function toFormValues(brand: any): BrandFormValues {
  if (!brand) return brandInitialValues;
  return {
    brand_name: str(brand.brand_name),
    tagline: str(brand.tagline),
    description: str(brand.description),
    product_categories: (brand.product_categories ?? []).join(', '),
    logo_url: str(brand.logo_url),
    cover_image_url: str(brand.cover_image_url),
    website_url: str(brand.website_url),
    instagram_url: str(brand.instagram_url),
    contact_person: str(brand.contact_person),
    contact_email: str(brand.contact_email),
    contact_phone: str(brand.contact_phone),
    registered_business_name: str(brand.registered_business_name),
    gstin: str(brand.gstin),
    pan: str(brand.pan),
    established_year: str(brand.established_year),
    address_line1: str(brand.address_line1),
    city: str(brand.city),
    state: str(brand.state),
    postal_code: str(brand.postal_code),
    country: brand.country || 'India',
    account_holder_name: str(brand.account_holder_name),
    account_number: str(brand.account_number),
    ifsc_code: str(brand.ifsc_code),
    upi_id: str(brand.upi_id),
  };
}

/**
 * Builds the `EcommBrandInput` payload. `documents` is deliberately omitted:
 * the server skips undefined input keys, so the brand's uploaded documents are
 * preserved instead of being blanked by a form that never edits them.
 */
export function toSubmitInput(values: BrandFormValues) {
  const year = Number.parseInt(values.established_year, 10);
  return {
    ...values,
    product_categories: parseCategories(values.product_categories),
    established_year: Number.isNaN(year) ? null : year,
  };
}
