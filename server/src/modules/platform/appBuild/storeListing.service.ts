import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { StoreListingModel, type IStoreListing } from './storeListing.model';
import { ascToken } from './appStoreConnect.gateway';
import { listCategories } from './ascListing.gateway';
import { readAscConfig } from './iosSigning.service';

/**
 * The store listing: one document, read by both pushes.
 *
 * Limits are the stores' own. They are checked on SAVE, so an operator learns
 * about a 31-character name while typing it rather than twenty minutes into a
 * push, and checked again when a push reads the listing — `requireAppleListing`
 * and `requirePlayListing` name every field that store still needs.
 */

const badInput = (msg: string) => new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });

/** Character and count limits, the stores' own. */
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

const TEXT_LIMITS: Record<string, number> = {
  name: LISTING_LIMITS.name,
  subtitle: LISTING_LIMITS.subtitle,
  short_description: LISTING_LIMITS.short_description,
  description: LISTING_LIMITS.description,
  keywords: LISTING_LIMITS.keywords,
  whats_new: LISTING_LIMITS.whats_new,
  copyright: LISTING_LIMITS.copyright,
  review_notes: LISTING_LIMITS.review_notes,
};

const URL_FIELDS = [
  'privacy_policy_url',
  'support_url',
  'marketing_url',
  'android_feature_graphic',
  'android_icon',
] as const;
const LIST_FIELDS = [
  'iphone_screenshots',
  'ipad_screenshots',
  'android_phone_screenshots',
  'android_tablet_7_screenshots',
  'android_tablet_10_screenshots',
] as const;
const PLAIN_FIELDS = [
  'locale',
  'primary_category',
  'contact_email',
  'contact_phone',
  'review_first_name',
  'review_last_name',
  'demo_account_name',
  'demo_account_password',
] as const;

const isHttpsUrl = (value: string): boolean => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};

/** The one listing, created empty the first time anyone asks. */
export async function getStoreListing(): Promise<IStoreListing> {
  return StoreListingModel.findOneAndUpdate(
    { singleton_key: 'store_listing' },
    { $setOnInsert: { singleton_key: 'store_listing' } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

function assertUrlList(field: string, values: unknown, max: number): string[] {
  if (!Array.isArray(values)) throw badInput(`${field} must be a list of image URLs.`);
  const urls = values.map((v) => String(v ?? '').trim()).filter(Boolean);
  if (urls.length > max) throw badInput(`${field} has ${urls.length} images; the store allows ${max}.`);
  const bad = urls.find((u) => !isHttpsUrl(u));
  if (bad) throw badInput(`${field} holds something that is not an https URL: ${bad}`);
  return urls;
}

/** Apply what was sent, refuse what a store would refuse, keep the rest. */
export async function updateStoreListing(input: Record<string, unknown>, by: string): Promise<IStoreListing> {
  const doc = await getStoreListing();
  for (const [field, max] of Object.entries(TEXT_LIMITS)) {
    if (input[field] === undefined) continue;
    const value = String(input[field] ?? '').trim();
    if (value.length > max) throw badInput(`${field} is ${value.length} characters; the stores allow ${max}.`);
    doc.set(field, value);
  }
  for (const field of URL_FIELDS) {
    if (input[field] === undefined) continue;
    const value = String(input[field] ?? '').trim();
    if (value && !isHttpsUrl(value)) throw badInput(`${field} must be an https URL.`);
    doc.set(field, value);
  }
  for (const field of LIST_FIELDS) {
    if (input[field] === undefined) continue;
    const max = field.startsWith('android_') ? LISTING_LIMITS.play_screenshots : LISTING_LIMITS.screenshots;
    doc.set(field, assertUrlList(field, input[field], max));
  }
  for (const field of PLAIN_FIELDS) {
    if (input[field] === undefined) continue;
    doc.set(field, String(input[field] ?? '').trim());
  }
  if (input.demo_account_required !== undefined) doc.demo_account_required = Boolean(input.demo_account_required);
  if (!doc.locale) doc.locale = 'en-US';
  doc.updated_by = by;
  await doc.save();
  logs.server.warn('appBuild', 'storeListingSaved', { by });
  return doc;
}

/** What the portal renders. The demo password is part of the form, so it is returned. */
export function pubStoreListing(doc: IStoreListing) {
  return {
    locale: doc.locale || 'en-US',
    name: doc.name,
    subtitle: doc.subtitle,
    short_description: doc.short_description,
    description: doc.description,
    keywords: doc.keywords,
    whats_new: doc.whats_new,
    copyright: doc.copyright,
    primary_category: doc.primary_category,
    privacy_policy_url: doc.privacy_policy_url,
    support_url: doc.support_url,
    marketing_url: doc.marketing_url,
    contact_email: doc.contact_email,
    contact_phone: doc.contact_phone,
    review_first_name: doc.review_first_name,
    review_last_name: doc.review_last_name,
    demo_account_name: doc.demo_account_name,
    demo_account_password: doc.demo_account_password,
    demo_account_required: doc.demo_account_required,
    review_notes: doc.review_notes,
    iphone_screenshots: doc.iphone_screenshots ?? [],
    ipad_screenshots: doc.ipad_screenshots ?? [],
    android_phone_screenshots: doc.android_phone_screenshots ?? [],
    android_tablet_7_screenshots: doc.android_tablet_7_screenshots ?? [],
    android_tablet_10_screenshots: doc.android_tablet_10_screenshots ?? [],
    android_feature_graphic: doc.android_feature_graphic,
    android_icon: doc.android_icon,
    updated_by: doc.updated_by,
    updated_at: doc.updated_at?.toISOString() ?? null,
  };
}

/** Apple's top-level iOS categories, or nothing until the key is configured. */
export async function appStoreCategories(): Promise<string[]> {
  const config = await readAscConfig();
  if (!config) return [];
  return listCategories(ascToken(config.creds));
}

const missing = (store: string, fields: string[]) =>
  badInput(
    `Store Listing is missing what ${store} needs: ${fields.join(', ')}. Fill it in Tech → App Builds → Store Listing.`
  );

/** Everything App Review needs, or the list of what is still empty. */
export function requireAppleListing(doc: IStoreListing): IStoreListing {
  const gaps: string[] = [];
  const need = (field: keyof IStoreListing, label: string) => {
    if (!String(doc[field] ?? '').trim()) gaps.push(label);
  };
  need('name', 'name');
  need('description', 'description');
  need('privacy_policy_url', 'privacy policy URL');
  need('support_url', 'support URL');
  need('copyright', 'copyright');
  need('primary_category', 'primary category');
  need('contact_email', 'contact email');
  need('contact_phone', 'contact phone');
  need('review_first_name', 'review contact first name');
  need('review_last_name', 'review contact last name');
  if ((doc.iphone_screenshots ?? []).length === 0) gaps.push('iPhone screenshots');
  if ((doc.ipad_screenshots ?? []).length === 0) gaps.push('iPad screenshots');
  if (doc.demo_account_required && (!doc.demo_account_name || !doc.demo_account_password)) {
    gaps.push('demo account (or untick "App Review needs a demo account")');
  }
  if (gaps.length) throw missing('the App Store', gaps);
  return doc;
}

/** Everything a Play production release needs, or the list of what is still empty. */
export function requirePlayListing(doc: IStoreListing): IStoreListing {
  const gaps: string[] = [];
  if (!doc.name) gaps.push('name');
  if (!doc.short_description) gaps.push('short description');
  if (!doc.description) gaps.push('description');
  if (!doc.contact_email) gaps.push('contact email');
  if ((doc.android_phone_screenshots ?? []).length < 2) gaps.push('at least 2 Android phone screenshots');
  if (!doc.android_feature_graphic) gaps.push('feature graphic');
  if (!doc.android_icon) gaps.push('app icon');
  if (gaps.length) throw missing('Google Play', gaps);
  return doc;
}
