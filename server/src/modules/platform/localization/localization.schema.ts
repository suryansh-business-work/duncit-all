import gql from "graphql-tag";

export const localizationTypeDefs = gql`
  "A language/country the platform can render in."
  type Locale {
    id: ID!
    "BCP-47 tag — the stable id used everywhere, including profile.locale."
    code: String!
    "Endonym shown in the language switcher."
    label: String!
    english_label: String!
    "Right-to-left script — flips document direction on the clients."
    is_rtl: Boolean!
    is_active: Boolean!
    "The source language every other locale falls back to. Exactly one."
    is_default: Boolean!
    sort_order: Int!
    updated_at: String
  }

  input UpsertLocaleInput {
    code: String!
    label: String!
    english_label: String
    is_rtl: Boolean
    is_active: Boolean
    is_default: Boolean
    sort_order: Int
  }

  "One translated string for one locale."
  type TranslationEntry {
    key: String!
    value: String!
  }

  "A translation key with every locale's text — one row in the admin table."
  type Translation {
    id: ID!
    key: String!
    "First key segment, e.g. 'mweb' — lets the admin filter portal-wise."
    surface: String!
    "Second key segment, e.g. 'shop' — lets the admin filter page-wise."
    page: String!
    description: String!
    values: [TranslationEntry!]!
    updated_at: String
  }

  input UpsertTranslationInput {
    key: String!
    description: String
    "Only the locales supplied are written; others keep their existing text."
    values: [TranslationValueInput!]
  }

  input TranslationValueInput {
    locale: String!
    value: String!
  }

  "Server-side table page for the shared table engine."
  type TranslationTablePage {
    rows: [Translation!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  extend type Query {
    "Every locale, for admin lists."
    locales: [Locale!]!
    "Active locales only — the language switcher on every surface."
    publicLocales: [Locale!]!
    """
    Flat key/value catalogue for one locale, merged over the default locale so a
    partially translated locale still returns complete text. Clients merge this
    over their bundled fallback, so a key missing here still renders.
    """
    publicTranslations(locale: String!): [TranslationEntry!]!
    "Admin table of translation keys, filterable surface-wise and page-wise."
    translationsTable(query: TableQueryInput): TranslationTablePage!
    """
    Keys the SERVER itself ships copy for (the MJML email templates), with their
    bundled English text. The admin merges these with the client surfaces' own
    bundles when seeding Translations, so email copy is translatable too.
    """
    serverTranslationSeed: [TranslationEntry!]!
  }

  extend type Mutation {
    upsertLocale(input: UpsertLocaleInput!): Locale!
    deleteLocale(code: String!): Boolean!
    upsertTranslation(input: UpsertTranslationInput!): Translation!
    deleteTranslation(key: String!): Boolean!
    """
    Bulk-add keys for a surface from a fallback bundle, so a new page's strings
    appear in the admin automatically instead of being typed by hand. Existing
    keys keep their translations; only missing ones are created.
    """
    importTranslationKeys(locale: String!, entries: [TranslationValueEntry!]!): Int!
  }

  input TranslationValueEntry {
    key: String!
    value: String!
  }
`;
