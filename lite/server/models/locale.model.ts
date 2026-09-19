import { Schema, model, type InferSchemaType } from 'mongoose';

/** A language the web app and the console can be read in. */
const localeSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    label: { type: String, required: true },
    english_label: { type: String, required: true },
    is_rtl: { type: Boolean, default: false },
    is_default: { type: Boolean, default: false },
    sort_order: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

export type LiteLocale = InferSchemaType<typeof localeSchema>;
export const LiteLocaleModel = model('LiteLocale', localeSchema, 'lite_locales');

/** One translated string: the flat `namespace.page.key` and its text in one locale. */
const translationSchema = new Schema(
  {
    locale: { type: String, required: true, index: true },
    key: { type: String, required: true },
    value: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

translationSchema.index({ locale: 1, key: 1 }, { unique: true });

export type LiteTranslation = InferSchemaType<typeof translationSchema>;
export const LiteTranslationModel = model('LiteTranslation', translationSchema, 'lite_translations');
