import { Schema, model, type Document } from 'mongoose';

/**
 * What the stores ask for when an app is listed — filled once in Tech → App
 * Builds → Store Listing and applied on every push, so a release is one button
 * rather than a form on appstoreconnect.apple.com and another on the Play
 * Console. One document: there is one app, and the two stores share most of
 * its copy. Where they differ (Apple's 30-character subtitle against Play's
 * 80-character short description, Apple's keywords, Play's feature graphic),
 * both are kept and each store reads its own.
 *
 * Screenshots are ImageKit URLs — uploaded through the portal's usual media
 * field — and the server fetches them when it pushes. Apple gets the iPhone and
 * iPad sets; Play gets phone, tablet, feature graphic and icon.
 */
export interface IStoreListing extends Document {
  singleton_key: string;
  /** BCP-47 tag both stores accept, e.g. en-US. The one locale the listing is written in. */
  locale: string;
  /** App name (Apple, 30) / title (Play, 30). */
  name: string;
  /** Apple subtitle, 30. */
  subtitle: string;
  /** Play short description, 80. */
  short_description: string;
  /** Full description, 4000 on both stores. */
  description: string;
  /** Apple keywords, comma-separated, 100. */
  keywords: string;
  /** Release notes: Apple "What's New" and the Play release's notes. 500 keeps both stores happy. */
  whats_new: string;
  /** Apple copyright line, e.g. "2026 Duncit". Required to submit. */
  copyright: string;
  /** Apple primary category id, e.g. SOCIAL_NETWORKING. Play's category has no API. */
  primary_category: string;
  privacy_policy_url: string;
  support_url: string;
  marketing_url: string;
  /** Public contact on Play; App Review's contact on Apple. */
  contact_email: string;
  contact_phone: string;
  /** App Review contact person. */
  review_first_name: string;
  review_last_name: string;
  /** Sign-in App Review can use. Required by Apple when the app has a login. */
  demo_account_name: string;
  demo_account_password: string;
  demo_account_required: boolean;
  review_notes: string;
  /** Apple 6.7"/6.9" iPhone set (1290×2796 or 1320×2868). 1–10. */
  iphone_screenshots: string[];
  /** Apple 13" iPad set (2064×2752 or 2048×2732). 1–10; the app supports tablets. */
  ipad_screenshots: string[];
  /** Play phone screenshots. 2–8. */
  android_phone_screenshots: string[];
  android_tablet_7_screenshots: string[];
  android_tablet_10_screenshots: string[];
  /** Play feature graphic, 1024×500. */
  android_feature_graphic: string;
  /** Play hi-res icon, 512×512. */
  android_icon: string;
  updated_by: string;
  created_at: Date;
  updated_at: Date;
}

const urls = { type: [String], default: [] };
const text = { type: String, default: '', trim: true };

const storeListingSchema = new Schema<IStoreListing>(
  {
    singleton_key: { type: String, required: true, unique: true, default: 'store_listing' },
    locale: { type: String, default: 'en-US', trim: true },
    name: text,
    subtitle: text,
    short_description: text,
    description: { type: String, default: '' },
    keywords: text,
    whats_new: { type: String, default: '' },
    copyright: text,
    primary_category: text,
    privacy_policy_url: text,
    support_url: text,
    marketing_url: text,
    contact_email: text,
    contact_phone: text,
    review_first_name: text,
    review_last_name: text,
    demo_account_name: text,
    demo_account_password: text,
    demo_account_required: { type: Boolean, default: true },
    review_notes: { type: String, default: '' },
    iphone_screenshots: urls,
    ipad_screenshots: urls,
    android_phone_screenshots: urls,
    android_tablet_7_screenshots: urls,
    android_tablet_10_screenshots: urls,
    android_feature_graphic: text,
    android_icon: text,
    updated_by: text,
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const StoreListingModel = model<IStoreListing>('StoreListing', storeListingSchema);
