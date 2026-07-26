import { Schema, model, type Document } from "mongoose";

/** A language/country the platform can render in, e.g. en-IN, hi-IN, ar-AE. */
export interface ILocale extends Document {
  /** BCP-47 tag — the stable id used everywhere, including profile.locale. */
  code: string;
  /** Endonym shown in the language switcher, e.g. "हिन्दी". */
  label: string;
  /** English name for admin lists, e.g. "Hindi (India)". */
  english_label: string;
  /** Right-to-left script — flips document direction / RN I18nManager. */
  is_rtl: boolean;
  is_active: boolean;
  /** Exactly one locale is the source language every other falls back to. */
  is_default: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

const localeSchema = new Schema<ILocale>(
  {
    code: { type: String, required: true, unique: true, trim: true },
    label: { type: String, required: true, trim: true },
    english_label: { type: String, default: "" },
    is_rtl: { type: Boolean, default: false },
    is_active: { type: Boolean, default: true },
    is_default: { type: Boolean, default: false },
    sort_order: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

export const LocaleModel = model<ILocale>("Locale", localeSchema);

/**
 * One translation KEY with every locale's text on it.
 *
 * A single document per key (rather than per key+locale) is what lets the admin
 * Translations table show one row per string with a column per language, and
 * lets a client fetch a whole locale in one query.
 *
 * `surface` and `page` are derived from the key on save (`mweb.shop.emptyState`
 * -> surface "mweb", page "shop") so the admin can filter portal-wise and
 * page-wise without parsing keys client-side.
 */
export interface ITranslation extends Document {
  key: string;
  surface: string;
  page: string;
  /** Note for translators — what this string is and where it appears. */
  description: string;
  /** locale code -> text. Missing/blank entries fall back at render time. */
  values: Map<string, string>;
  created_at: Date;
  updated_at: Date;
}

const translationSchema = new Schema<ITranslation>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    surface: { type: String, default: "", index: true },
    page: { type: String, default: "", index: true },
    description: { type: String, default: "" },
    values: { type: Map, of: String, default: () => new Map<string, string>() },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

export const TranslationModel = model<ITranslation>("Translation", translationSchema);

/** Split a dot-path key into its surface + page segments. */
export function keySegments(key: string): { surface: string; page: string } {
  const parts = (key ?? "").split(".").filter(Boolean);
  return { surface: parts[0] ?? "", page: parts[1] ?? "" };
}
