import { LiteLocaleModel, LiteTranslationModel } from '../models/locale.model';
import { badInput, notFound } from '../utils/errors';
import { iso } from '../utils/ids';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '../utils/table-query';
import { cleanText } from '../utils/validate';

/**
 * Lite's own Localization: the locales a reader can pick, and the translated
 * strings per locale. The web app and the console ship their English copy
 * as a local fallback bundle and layer these entries over it — the same
 * `LocaleProvider` the rest of Duncit uses, pointed at this API.
 */
const DEFAULT_LOCALE = { code: 'en-IN', label: 'English (India)', english_label: 'English (India)', is_rtl: false, is_default: true, sort_order: 0, is_active: true };

const TRANSLATIONS_TABLE: TableEntityConfig = {
  searchFields: ['key', 'value'],
  sortFields: { key: 'key', value: 'value', updated_at: 'updated_at' },
  filterFields: { key: { type: 'string' } },
  defaultSort: { key: 1 },
};

export interface LocaleInput {
  code: string;
  label: string;
  english_label: string;
  is_rtl?: boolean | null;
  is_default?: boolean | null;
  sort_order?: number | null;
  is_active?: boolean | null;
}

const LOCALE_CODE = /^[a-z]{2,3}(?:-[A-Za-z]{2,4})?$/;

export const localizationService = {
  async seed(): Promise<void> {
    const count = await LiteLocaleModel.countDocuments({});
    if (count === 0) await LiteLocaleModel.create(DEFAULT_LOCALE);
  },

  async defaultCode(): Promise<string> {
    const doc = await LiteLocaleModel.findOne({ is_default: true }).lean();
    return doc?.code ?? 'en-IN';
  },

  async publicLocales() {
    const docs = await LiteLocaleModel.find({ is_active: true }).sort({ sort_order: 1, code: 1 }).lean();
    return docs.map((l) => ({ code: l.code, label: l.label, english_label: l.english_label, is_rtl: Boolean(l.is_rtl), is_default: Boolean(l.is_default), sort_order: l.sort_order ?? 0 }));
  },

  /** The locale's entries merged over the default locale's, flat. */
  async publicTranslations(locale: string) {
    const fallback = await this.defaultCode();
    const codes = locale === fallback ? [fallback] : [fallback, locale];
    const docs = await LiteTranslationModel.find({ locale: { $in: codes } }).lean();
    const merged = new Map<string, string>();
    for (const code of codes) for (const row of docs) if (row.locale === code && row.value) merged.set(row.key, row.value);
    return [...merged].map(([key, value]) => ({ key, value }));
  },

  async locales() {
    const [docs, counts] = await Promise.all([
      LiteLocaleModel.find({}).sort({ sort_order: 1, code: 1 }).lean(),
      LiteTranslationModel.aggregate<{ _id: string; n: number }>([{ $match: { value: { $ne: '' } } }, { $group: { _id: '$locale', n: { $sum: 1 } } }]),
    ]);
    const by = new Map(counts.map((c) => [c._id, c.n]));
    return docs.map((l) => ({ ...l, is_rtl: Boolean(l.is_rtl), is_default: Boolean(l.is_default), is_active: l.is_active !== false, sort_order: l.sort_order ?? 0, translated_count: by.get(l.code) ?? 0 }));
  },

  async upsertLocale(input: LocaleInput) {
    const code = cleanText(input.code, 12, 'Code', true);
    if (!LOCALE_CODE.test(code)) throw badInput('A locale code looks like hi-IN or en');
    const $set: Record<string, unknown> = { label: cleanText(input.label, 60, 'Label', true), english_label: cleanText(input.english_label, 60, 'English label', true) };
    if (input.is_rtl != null) $set.is_rtl = input.is_rtl;
    if (input.sort_order != null) $set.sort_order = Math.trunc(input.sort_order);
    if (input.is_active != null) $set.is_active = input.is_active;
    if (input.is_default) {
      await LiteLocaleModel.updateMany({ code: { $ne: code } }, { $set: { is_default: false } });
      $set.is_default = true;
      $set.is_active = true;
    }
    await LiteLocaleModel.updateOne({ code }, { $set, $setOnInsert: { code } }, { upsert: true });
    const all = await this.locales();
    return all.find((l) => l.code === code)!;
  },

  async deleteLocale(code: string) {
    const doc = await LiteLocaleModel.findOne({ code }).lean();
    if (!doc) return false;
    if (doc.is_default) throw badInput('The default locale cannot be deleted');
    await Promise.all([LiteLocaleModel.deleteOne({ code }), LiteTranslationModel.deleteMany({ locale: code })]);
    return true;
  },

  async translationsTable(locale: string, query: TableQueryInput | null | undefined) {
    if (!(await LiteLocaleModel.exists({ code: locale }))) throw notFound('Locale');
    const page = await runTableQuery<any>(LiteTranslationModel, { locale }, query, TRANSLATIONS_TABLE);
    return { ...page, rows: page.docs.map((d) => ({ id: String(d._id), key: d.key, locale: d.locale, value: d.value, updated_at: iso(d.updated_at) ?? '' })) };
  },

  async setTranslations(locale: string, entries: { key: string; value: string }[]) {
    if (!(await LiteLocaleModel.exists({ code: locale }))) throw notFound('Locale');
    let written = 0;
    for (const entry of entries) {
      const key = cleanText(entry.key, 200, 'Key', true);
      await LiteTranslationModel.updateOne({ locale, key }, { $set: { value: cleanText(entry.value, 5000, 'Text') } }, { upsert: true });
      written += 1;
    }
    return written;
  },

  async deleteTranslation(id: string) {
    const res = await LiteTranslationModel.deleteOne({ _id: id });
    return res.deletedCount > 0;
  },

  /** Seed every shipped key into the default locale, never overwriting one that exists. */
  async importKeys(entries: { key: string; value: string }[]) {
    const locale = await this.defaultCode();
    let created = 0;
    let skipped = 0;
    for (const entry of entries) {
      const res = await LiteTranslationModel.updateOne({ locale, key: entry.key }, { $setOnInsert: { locale, key: entry.key, value: entry.value } }, { upsert: true });
      if (res.upsertedCount > 0) created += 1;
      else skipped += 1;
    }
    return { created, skipped };
  },
};
