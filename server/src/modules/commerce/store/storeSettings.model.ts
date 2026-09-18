import { Schema, model, type Document } from 'mongoose';

/**
 * The pet store's own settings — one document, edited from the ecomm portal.
 *
 * Money rules that belong to the WHOLE platform (currency, GST, the platform
 * fee, dummy mode) stay in FinanceSettings and are read from there; this holds
 * only what is the store's to decide: whether it is open, who may check out and
 * how, when shipping is free, and the copy on its own pages.
 */
export interface IStoreSocialLink {
  label: string;
  url: string;
}

export interface IStoreSettings extends Document {
  singleton_key: string;
  store_enabled: boolean;
  store_name: string;
  tagline: string;
  logo_url: string;
  favicon_url: string;
  support_email: string;
  support_phone: string;
  whatsapp_number: string;
  announcement_enabled: boolean;
  announcement_text: string;
  announcement_link: string;
  guest_checkout_enabled: boolean;
  cod_enabled: boolean;
  cod_fee: number;
  cod_min_order: number;
  cod_max_order: number;
  cod_requires_otp: boolean;
  cod_blocked_pincodes: string[];
  prepaid_discount_pct: number;
  min_order_value: number;
  free_shipping_above: number;
  flat_shipping_fee: number;
  max_qty_per_line: number;
  returns_enabled: boolean;
  return_window_days: number;
  return_reasons: string[];
  cancel_reasons: string[];
  restock_on_cancel: boolean;
  autoship_enabled: boolean;
  autoship_discount_pct: number;
  autoship_frequencies: number[];
  seo_title: string;
  seo_description: string;
  og_image_url: string;
  shipping_policy_html: string;
  returns_policy_html: string;
  terms_html: string;
  about_html: string;
  social_links: IStoreSocialLink[];
  updated_by_id: string | null;
  created_at: Date;
  updated_at: Date;
}

const socialLinkSchema = new Schema<IStoreSocialLink>(
  {
    label: { type: String, default: '', trim: true, maxlength: 40 },
    url: { type: String, default: '', trim: true, maxlength: 500 },
  },
  { _id: false }
);

const storeSettingsSchema = new Schema<IStoreSettings>(
  {
    singleton_key: { type: String, default: 'store', unique: true },
    store_enabled: { type: Boolean, default: false },
    store_name: { type: String, default: 'Duncit Pet Store', trim: true, maxlength: 80 },
    tagline: { type: String, default: '', trim: true, maxlength: 160 },
    logo_url: { type: String, default: '', trim: true },
    favicon_url: { type: String, default: '', trim: true },
    support_email: { type: String, default: '', trim: true, lowercase: true, maxlength: 254 },
    support_phone: { type: String, default: '', trim: true, maxlength: 24 },
    whatsapp_number: { type: String, default: '', trim: true, maxlength: 24 },
    announcement_enabled: { type: Boolean, default: false },
    announcement_text: { type: String, default: '', trim: true, maxlength: 200 },
    announcement_link: { type: String, default: '', trim: true, maxlength: 500 },
    guest_checkout_enabled: { type: Boolean, default: true },
    cod_enabled: { type: Boolean, default: false },
    cod_fee: { type: Number, default: 0, min: 0, max: 10000 },
    cod_min_order: { type: Number, default: 0, min: 0 },
    cod_max_order: { type: Number, default: 0, min: 0 },
    cod_requires_otp: { type: Boolean, default: true },
    cod_blocked_pincodes: { type: [String], default: [] },
    prepaid_discount_pct: { type: Number, default: 0, min: 0, max: 50 },
    min_order_value: { type: Number, default: 0, min: 0 },
    free_shipping_above: { type: Number, default: 0, min: 0 },
    flat_shipping_fee: { type: Number, default: 0, min: 0 },
    max_qty_per_line: { type: Number, default: 10, min: 1, max: 999 },
    returns_enabled: { type: Boolean, default: true },
    return_window_days: { type: Number, default: 7, min: 0, max: 365 },
    return_reasons: { type: [String], default: [] },
    cancel_reasons: { type: [String], default: [] },
    restock_on_cancel: { type: Boolean, default: true },
    autoship_enabled: { type: Boolean, default: false },
    autoship_discount_pct: { type: Number, default: 0, min: 0, max: 50 },
    autoship_frequencies: { type: [Number], default: [] },
    seo_title: { type: String, default: '', trim: true, maxlength: 160 },
    seo_description: { type: String, default: '', trim: true, maxlength: 320 },
    og_image_url: { type: String, default: '', trim: true },
    shipping_policy_html: { type: String, default: '', maxlength: 50000 },
    returns_policy_html: { type: String, default: '', maxlength: 50000 },
    terms_html: { type: String, default: '', maxlength: 50000 },
    about_html: { type: String, default: '', maxlength: 50000 },
    social_links: { type: [socialLinkSchema], default: [] },
    updated_by_id: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const StoreSettingsModel = model<IStoreSettings>('StoreSettings', storeSettingsSchema);

/** The one settings document, created on first read with every default. */
export async function getStoreSettings(): Promise<IStoreSettings> {
  return StoreSettingsModel.findOneAndUpdate(
    { singleton_key: 'store' },
    { $setOnInsert: { singleton_key: 'store' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).exec() as Promise<IStoreSettings>;
}
