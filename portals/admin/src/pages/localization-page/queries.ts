import { gql } from '@apollo/client';

const LOCALE_FIELDS = `
  id
  code
  label
  english_label
  is_rtl
  is_active
  is_default
  sort_order
  updated_at
`;

export const LOCALES = gql`
  query Locales {
    locales {
      ${LOCALE_FIELDS}
    }
  }
`;

export const UPSERT_LOCALE = gql`
  mutation UpsertLocale($input: UpsertLocaleInput!) {
    upsertLocale(input: $input) {
      ${LOCALE_FIELDS}
    }
  }
`;

export const DELETE_LOCALE = gql`
  mutation DeleteLocale($code: String!) {
    deleteLocale(code: $code)
  }
`;

export const TRANSLATIONS_TABLE = gql`
  query TranslationsTable($query: TableQueryInput) {
    translationsTable(query: $query) {
      total
      page
      page_size
      rows {
        id
        key
        surface
        page
        description
        values {
          key
          value
        }
        updated_at
      }
    }
  }
`;

export const TRANSLATION_GROUPS = gql`
  query TranslationGroups($query: TableQueryInput) {
    translationGroups(query: $query) {
      total
      page
      page_size
      rows {
        id
        surface
        page
        key_count
        locales {
          locale
          translated
        }
      }
    }
  }
`;

export const UPSERT_TRANSLATION = gql`
  mutation UpsertTranslation($input: UpsertTranslationInput!) {
    upsertTranslation(input: $input) {
      id
      key
    }
  }
`;

export const DELETE_TRANSLATION = gql`
  mutation DeleteTranslation($key: String!) {
    deleteTranslation(key: $key)
  }
`;

export const SERVER_TRANSLATION_SEED = gql`
  query ServerTranslationSeed {
    serverTranslationSeed {
      key
      value
    }
  }
`;

export const IMPORT_TRANSLATION_KEYS = gql`
  mutation ImportTranslationKeys($locale: String!, $entries: [TranslationValueEntry!]!) {
    importTranslationKeys(locale: $locale, entries: $entries)
  }
`;

export const LOCALE_COVERAGE = gql`
  query LocaleCoverage {
    localeCoverage {
      locale
      total_keys
      translated_keys
    }
  }
`;

/** Field list only — no braces of its own, so interpolating it stays parseable. */
const AUTO_TRANSLATE_JOB_FIELDS = `
  id
  locale
  source_locale
  status
  replace_existing
  total_keys
  done_keys
  translated_keys
  failed_keys
  ai_model
  error
  started_at
  finished_at
`;

export const AUTO_TRANSLATE_JOB = gql`
  query AutoTranslateJob($locale: String!) {
    autoTranslateJob(locale: $locale) {
      ${AUTO_TRANSLATE_JOB_FIELDS}
    }
  }
`;

export const AUTO_TRANSLATE_PENDING = gql`
  query AutoTranslatePending($locale: String!, $replace_existing: Boolean) {
    autoTranslatePending(locale: $locale, replace_existing: $replace_existing)
  }
`;

export const START_AUTO_TRANSLATE = gql`
  mutation StartAutoTranslate($locale: String!, $replace_existing: Boolean) {
    startAutoTranslate(locale: $locale, replace_existing: $replace_existing) {
      ${AUTO_TRANSLATE_JOB_FIELDS}
    }
  }
`;

export const CANCEL_AUTO_TRANSLATE = gql`
  mutation CancelAutoTranslate($id: ID!) {
    cancelAutoTranslate(id: $id) {
      ${AUTO_TRANSLATE_JOB_FIELDS}
    }
  }
`;

export interface LocaleRow {
  id: string;
  code: string;
  label: string;
  english_label: string;
  is_rtl: boolean;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  updated_at?: string | null;
}

export interface TranslationRow {
  id: string;
  key: string;
  surface: string;
  page: string;
  description: string;
  /** locale code -> text, as returned by the API (a key/value list). */
  values: { key: string; value: string }[];
  updated_at?: string | null;
}

/** One namespace — the surface + page pair a set of keys shares. */
export interface TranslationGroupRow {
  /** `surface.page`, e.g. 'mweb.shop'. */
  id: string;
  surface: string;
  page: string;
  key_count: number;
  /** One entry per active locale; translated < key_count means a gap. */
  locales: { locale: string; translated: number }[];
}

/** How much of the catalogue one locale carries text for. */
export interface LocaleCoverageRow {
  locale: string;
  total_keys: number;
  translated_keys: number;
}

/** One auto-translation run. `status` is RUNNING | SUCCEEDED | FAILED | CANCELLED. */
export interface AutoTranslateJobRow {
  id: string;
  locale: string;
  source_locale: string;
  status: string;
  replace_existing: boolean;
  total_keys: number;
  done_keys: number;
  translated_keys: number;
  failed_keys: number;
  ai_model: string;
  error: string;
  started_at?: string | null;
  finished_at?: string | null;
}

/** Text for one locale on a translation row, '' when untranslated. */
export const valueFor = (row: TranslationRow, code: string): string =>
  row.values.find((v) => v.key === code)?.value ?? '';

/** Keys of a namespace already translated into one locale. */
export const translatedFor = (row: TranslationGroupRow, code: string): number =>
  row.locales.find((l) => l.locale === code)?.translated ?? 0;
