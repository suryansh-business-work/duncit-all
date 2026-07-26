import { GraphQLError } from "graphql";
import {
  runTableQuery,
  type TableEntityConfig,
  type TableQueryInput,
} from "@utils/table-query";
import {
  LocaleModel,
  TranslationModel,
  keySegments,
  type ILocale,
  type ITranslation,
} from "./localization.model";

/** Search/sort/filter allowlist for the admin Translations table. Surface and
 * page are filterable so the admin can work portal-wise and page-wise. */
const TRANSLATION_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ["key", "description"],
  sortFields: { key: "key", surface: "surface", page: "page", updated_at: "updated_at" },
  filterFields: {
    surface: { path: "surface", type: "string" },
    page: { path: "page", type: "string" },
  },
  defaultSort: { key: 1 },
};

const badInput = (message: string) =>
  new GraphQLError(message, { extensions: { code: "BAD_USER_INPUT" } });

const localeToPub = (doc: ILocale) => ({
  id: String(doc._id),
  code: doc.code,
  label: doc.label,
  english_label: doc.english_label ?? "",
  is_rtl: !!doc.is_rtl,
  is_active: doc.is_active !== false,
  is_default: !!doc.is_default,
  sort_order: doc.sort_order ?? 0,
  updated_at: doc.updated_at?.toISOString?.() ?? "",
});

const valuesToPub = (values: ITranslation["values"]) =>
  [...(values?.entries?.() ?? [])].map(([key, value]) => ({ key, value }));

const translationToPub = (doc: ITranslation) => ({
  id: String(doc._id),
  key: doc.key,
  surface: doc.surface ?? "",
  page: doc.page ?? "",
  description: doc.description ?? "",
  values: valuesToPub(doc.values),
  updated_at: doc.updated_at?.toISOString?.() ?? "",
});

export const localizationService = {
  async listLocales() {
    const docs = await LocaleModel.find().sort({ sort_order: 1, code: 1 });
    return docs.map(localeToPub);
  },

  async listPublicLocales() {
    const docs = await LocaleModel.find({ is_active: true }).sort({ sort_order: 1, code: 1 });
    return docs.map(localeToPub);
  },

  /** The platform's source language — every other locale falls back to it. */
  async defaultLocaleCode(): Promise<string | null> {
    const doc = await LocaleModel.findOne({ is_default: true, is_active: true });
    if (doc) return doc.code;
    const first = await LocaleModel.findOne({ is_active: true }).sort({ sort_order: 1, code: 1 });
    return first?.code ?? null;
  },

  /**
   * Flat catalogue for one locale, already merged over the default locale so a
   * half-translated language still returns complete text. Clients merge this
   * over their bundled fallback on top of that.
   */
  async publicTranslations(locale: string) {
    const code = (locale ?? "").trim();
    if (!code) throw badInput("A locale code is required");
    const fallbackCode = await this.defaultLocaleCode();
    const docs = await TranslationModel.find().select("key values").lean();

    const entries: { key: string; value: string }[] = [];
    for (const doc of docs as any[]) {
      // .lean() gives a plain object for the Map field.
      const values: Record<string, string> = doc.values ?? {};
      const own = values[code];
      const inherited = fallbackCode ? values[fallbackCode] : undefined;
      const text = own && own.trim() !== "" ? own : inherited;
      if (text && text.trim() !== "") entries.push({ key: doc.key, value: text });
    }
    return entries;
  },

  async upsertLocale(input: {
    code: string;
    label: string;
    english_label?: string | null;
    is_rtl?: boolean | null;
    is_active?: boolean | null;
    is_default?: boolean | null;
    sort_order?: number | null;
  }) {
    const code = (input.code ?? "").trim();
    const label = (input.label ?? "").trim();
    if (!code) throw badInput("A locale code is required");
    if (!label) throw badInput("A locale label is required");

    const update: Record<string, unknown> = {
      code,
      label,
      english_label: (input.english_label ?? "").trim(),
      is_rtl: input.is_rtl === true,
      is_active: input.is_active !== false,
      sort_order: input.sort_order ?? 0,
    };
    if (input.is_default !== undefined && input.is_default !== null) {
      update.is_default = input.is_default;
    }

    const doc = await LocaleModel.findOneAndUpdate({ code }, { $set: update }, {
      new: true,
      upsert: true,
    });
    // Exactly one default: promoting this locale demotes every other, so the
    // fallback chain can never point at two source languages.
    if (doc.is_default) {
      await LocaleModel.updateMany({ _id: { $ne: doc._id } }, { $set: { is_default: false } });
    }
    return localeToPub(doc);
  },

  async deleteLocale(code: string) {
    const doc = await LocaleModel.findOne({ code: (code ?? "").trim() });
    if (!doc) return false;
    if (doc.is_default) throw badInput("The default locale cannot be deleted");
    await LocaleModel.deleteOne({ _id: doc._id });
    // Drop the language's text so no catalogue keeps serving a dead locale.
    await TranslationModel.updateMany({}, { $unset: { [`values.${doc.code}`]: "" } });
    return true;
  },

  async upsertTranslation(input: {
    key: string;
    description?: string | null;
    values?: { locale: string; value: string }[] | null;
  }) {
    const key = (input.key ?? "").trim();
    if (!key) throw badInput("A translation key is required");
    const { surface, page } = keySegments(key);

    const set: Record<string, unknown> = { key, surface, page };
    if (input.description !== undefined && input.description !== null) {
      set.description = input.description;
    }
    // Only the supplied locales are written, so editing one language never
    // clears another's text.
    for (const entry of input.values ?? []) {
      const locale = (entry.locale ?? "").trim();
      if (locale) set[`values.${locale}`] = entry.value ?? "";
    }

    const doc = await TranslationModel.findOneAndUpdate({ key }, { $set: set }, {
      new: true,
      upsert: true,
    });
    return translationToPub(doc);
  },

  async deleteTranslation(key: string) {
    const result = await TranslationModel.deleteOne({ key: (key ?? "").trim() });
    return result.deletedCount > 0;
  },

  /**
   * Create any keys a surface's fallback bundle has but the database does not.
   * This is what makes new page strings show up in the admin automatically
   * rather than being retyped by hand. Existing keys are left untouched.
   */
  async importTranslationKeys(locale: string, entries: { key: string; value: string }[]) {
    const code = (locale ?? "").trim();
    if (!code) throw badInput("A locale code is required");
    const rows = (entries ?? []).filter((e) => (e.key ?? "").trim() !== "");
    if (rows.length === 0) return 0;

    const existing = new Set(
      (await TranslationModel.find({ key: { $in: rows.map((r) => r.key.trim()) } })
        .select("key")
        .lean()).map((d: any) => d.key),
    );

    const fresh = rows.filter((r) => !existing.has(r.key.trim()));
    if (fresh.length === 0) return 0;

    await TranslationModel.insertMany(
      fresh.map((r) => {
        const key = r.key.trim();
        const { surface, page } = keySegments(key);
        return { key, surface, page, description: "", values: { [code]: r.value ?? "" } };
      }),
    );
    return fresh.length;
  },

  async translationsTable(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<ITranslation>(
      TranslationModel,
      {},
      input,
      TRANSLATION_TABLE_CONFIG,
    );
    return { rows: docs.map(translationToPub), total, page, page_size };
  },
};
