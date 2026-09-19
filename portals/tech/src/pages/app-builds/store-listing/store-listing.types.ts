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
  required: string;
  tooLong: (max: number) => string;
  copyrightNoUrl: string;
  invalidUrl: string;
  invalidEmail: string;
  tooFewImages: (min: number) => string;
  tooManyImages: (max: number) => string;
}

/** Google Play wants at least this many phone screenshots; Apple wants one of each set. */
const MIN_PLAY_PHONE_SCREENSHOTS = 2;

/**
 * Anything Apple reads as a web address in the copyright line: a scheme, a
 * www. host or a bare domain like duncit.com. The server refuses the same.
 */
const URL_LIKE = /https?:\/\/|www\.|\b[\w-]+\.[a-z]{2,}\b/i;

const EMAIL = z.email();

const text = (max: number, m: StoreListingMessages) => z.string().trim().max(max, m.tooLong(max));
const needed = (max: number, m: StoreListingMessages) => text(max, m).min(1, m.required);
const plain = () => z.string().trim();
const neededPlain = (m: StoreListingMessages) => plain().min(1, m.required);
const httpsUrl = (m: StoreListingMessages) =>
  z.string().trim().refine((v) => v === '' || v.startsWith('https://'), m.invalidUrl);
const neededHttpsUrl = (m: StoreListingMessages) => httpsUrl(m).refine((v) => v !== '', m.required);
const images = (max: number, m: StoreListingMessages) =>
  z.array(z.string()).max(max, m.tooManyImages(max));
const neededImages = (min: number, max: number, m: StoreListingMessages) =>
  images(max, m).min(min, m.tooFewImages(min));

const DEMO_ACCOUNT_FIELDS = ['demo_account_name', 'demo_account_password'] as const;

/**
 * Required here is what a push needs — the same fields the server names when
 * it refuses a push — so the gap shows on the field, at save, rather than as
 * a list twenty minutes into a push. The demo account is required only while
 * App Review is told it needs one.
 */
export const storeListingSchema = (m: StoreListingMessages) =>
  z
    .object({
      locale: plain(),
      name: needed(LISTING_LIMITS.name, m),
      subtitle: text(LISTING_LIMITS.subtitle, m),
      short_description: needed(LISTING_LIMITS.short_description, m),
      description: needed(LISTING_LIMITS.description, m),
      keywords: text(LISTING_LIMITS.keywords, m),
      whats_new: text(LISTING_LIMITS.whats_new, m),
      copyright: needed(LISTING_LIMITS.copyright, m).refine((v) => !URL_LIKE.test(v), m.copyrightNoUrl),
      primary_category: neededPlain(m),
      privacy_policy_url: neededHttpsUrl(m),
      support_url: neededHttpsUrl(m),
      marketing_url: httpsUrl(m),
      contact_email: neededPlain(m).refine((v) => EMAIL.safeParse(v).success, m.invalidEmail),
      contact_phone: neededPlain(m),
      review_first_name: neededPlain(m),
      review_last_name: neededPlain(m),
      demo_account_name: plain(),
      demo_account_password: plain(),
      demo_account_required: z.boolean(),
      review_notes: text(LISTING_LIMITS.review_notes, m),
      iphone_screenshots: neededImages(1, LISTING_LIMITS.screenshots, m),
      ipad_screenshots: neededImages(1, LISTING_LIMITS.screenshots, m),
      android_phone_screenshots: neededImages(MIN_PLAY_PHONE_SCREENSHOTS, LISTING_LIMITS.play_screenshots, m),
      android_tablet_7_screenshots: images(LISTING_LIMITS.play_screenshots, m),
      android_tablet_10_screenshots: images(LISTING_LIMITS.play_screenshots, m),
      android_feature_graphic: neededHttpsUrl(m),
      android_icon: neededHttpsUrl(m),
    })
    .superRefine((values, ctx) => {
      if (!values.demo_account_required) return;
      for (const field of DEMO_ACCOUNT_FIELDS) {
        if (values[field] === '') ctx.addIssue({ code: 'custom', path: [field], message: m.required });
      }
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
