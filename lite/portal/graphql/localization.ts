import { gql } from '@apollo/client';

export interface LiteLocale {
  code: string;
  label: string;
  english_label: string;
  is_rtl: boolean;
  is_default: boolean;
  sort_order: number;
  is_active: boolean;
  translated_count: number;
}

export interface LiteLocaleInput {
  code: string;
  label: string;
  english_label: string;
  is_rtl?: boolean;
  is_default?: boolean;
  sort_order?: number;
  is_active?: boolean;
}

export interface LiteTranslationRow {
  id: string;
  key: string;
  locale: string;
  value: string;
  updated_at: string;
}

export interface LiteImportResult {
  created: number;
  skipped: number;
}

const LOCALE_FIELDS = gql`
  fragment LiteLocaleFields on LiteLocale {
    code
    label
    english_label
    is_rtl
    is_default
    sort_order
    is_active
    translated_count
  }
`;

export const LITE_LOCALES = gql`
  query LiteLocales {
    liteLocales {
      ...LiteLocaleFields
    }
  }
  ${LOCALE_FIELDS}
`;

export const LITE_UPSERT_LOCALE = gql`
  mutation LiteUpsertLocale($input: LiteLocaleInput!) {
    liteUpsertLocale(input: $input) {
      ...LiteLocaleFields
    }
  }
  ${LOCALE_FIELDS}
`;

export const LITE_DELETE_LOCALE = gql`
  mutation LiteDeleteLocale($code: String!) {
    liteDeleteLocale(code: $code)
  }
`;

export const LITE_TRANSLATIONS_TABLE = gql`
  query LiteTranslationsTable($locale: String!, $query: TableQueryInput) {
    liteTranslationsTable(locale: $locale, query: $query) {
      rows {
        id
        key
        locale
        value
        updated_at
      }
      total
      page
      page_size
    }
  }
`;

export const LITE_SET_TRANSLATIONS = gql`
  mutation LiteSetTranslations($locale: String!, $entries: [LiteTranslationEntryInput!]!) {
    liteSetTranslations(locale: $locale, entries: $entries)
  }
`;

export const LITE_DELETE_TRANSLATION = gql`
  mutation LiteDeleteTranslation($id: ID!) {
    liteDeleteTranslation(id: $id)
  }
`;

export const LITE_IMPORT_TRANSLATION_KEYS = gql`
  mutation LiteImportTranslationKeys($entries: [LiteTranslationEntryInput!]!) {
    liteImportTranslationKeys(entries: $entries) {
      created
      skipped
    }
  }
`;
