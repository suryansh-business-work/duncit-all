import { z } from 'zod';

/** Character and count limits, the stores' own. The server checks the same numbers on save. */
export const LISTING_LIMITS = {
  name: 30,
  subtitle: 30,
  short_description: 80,
  description: 4000,
  keywords: 100,
  whats_new: 500,
  copyright: 100,
  review_notes: 4000,
  screenshots: 10,
  play_screenshots: 8,
} as const;

export interface StoreListingMessages {
  tooLong: (max: number) => string;
  invalidUrl: string;
  invalidEmail: string;
  tooManyImages: (max: number) => string;
}

const EMAIL = z.email();

const text = (max: number, m: StoreListingMessages) => z.string().trim().max(max, m.tooLong(max));
const plain = () => z.string().trim();
const httpsUrl = (m: StoreListingMessages) =>
  z.string().trim().refine((v) => v === '' || v.startsWith('https://'), m.invalidUrl);
const images = (max: number, m: StoreListingMessages) =>
  z.array(z.string()).max(max, m.tooManyImages(max));

/**
 * Nothing is required to SAVE: the listing is filled in over time. What a push
 * needs is checked by the server at the click, naming every missing field.
 */
export const storeListingSchema = (m: StoreListingMessages) =>
  z.object({
    locale: plain(),
    name: text(LISTING_LIMITS.name, m),
    subtitle: text(LISTING_LIMITS.subtitle, m),
    short_description: text(LISTING_LIMITS.short_description, m),
    description: text(LISTING_LIMITS.description, m),
    keywords: text(LISTING_LIMITS.keywords, m),
    whats_new: text(LISTING_LIMITS.whats_new, m),
    copyright: text(LISTING_LIMITS.copyright, m),
    primary_category: plain(),
    privacy_policy_url: httpsUrl(m),
    support_url: httpsUrl(m),
    marketing_url: httpsUrl(m),
    contact_email: z
      .string()
      .trim()
      .refine((v) => v === '' || EMAIL.safeParse(v).success, m.invalidEmail),
    contact_phone: plain(),
    review_first_name: plain(),
    review_last_name: plain(),
    demo_account_name: plain(),
    demo_account_password: plain(),
    demo_account_required: z.boolean(),
    review_notes: text(LISTING_LIMITS.review_notes, m),
    iphone_screenshots: images(LISTING_LIMITS.screenshots, m),
    ipad_screenshots: images(LISTING_LIMITS.screenshots, m),
    android_phone_screenshots: images(LISTING_LIMITS.play_screenshots, m),
    android_tablet_7_screenshots: images(LISTING_LIMITS.play_screenshots, m),
    android_tablet_10_screenshots: images(LISTING_LIMITS.play_screenshots, m),
    android_feature_graphic: httpsUrl(m),
    android_icon: httpsUrl(m),
  });

export type StoreListingSchema = ReturnType<typeof storeListingSchema>;
export type StoreListingValues = z.infer<StoreListingSchema>;

/** The server's record: the editable fields plus who saved them last. */
export type StoreListing = StoreListingValues & { updated_by: string; updated_at: string | null };

/**
 * The form's values from the server's record — exactly the schema's fields, so
 * `updated_by`, `updated_at` and Apollo's `__typename` never reach the input.
 */
export const toFormValues = (listing: StoreListing, schema: StoreListingSchema): StoreListingValues =>
  Object.fromEntries(
    Object.keys(schema.shape).map((key) => [key, listing[key as keyof StoreListingValues]])
  ) as StoreListingValues;

/** Which tab a field lives on, so a failed save can open the tab that holds the error. */
export type ListingSection = 'copy' | 'screenshots' | 'review' | 'checklist';

const REVIEW_FIELDS = new Set<keyof StoreListingValues>([
  'contact_email',
  'contact_phone',
  'review_first_name',
  'review_last_name',
  'demo_account_name',
  'demo_account_password',
  'demo_account_required',
  'review_notes',
]);

export const sectionOf = (field: keyof StoreListingValues): ListingSection => {
  if (REVIEW_FIELDS.has(field)) return 'review';
  if (field.endsWith('_screenshots') || field === 'android_feature_graphic' || field === 'android_icon') {
    return 'screenshots';
  }
  return 'copy';
};
