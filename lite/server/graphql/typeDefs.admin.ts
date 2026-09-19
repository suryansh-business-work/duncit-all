import gql from 'graphql-tag';

/**
 * The console at luma-portal.duncit.com, plus the three queries the shared
 * `@duncit/app-settings` providers ask every Duncit API for (locales,
 * translations, display settings) so the same LocaleProvider and date
 * formatter run here unchanged.
 */
export const adminTypeDefs = gql`
  enum LiteEnvCategory {
    EMAIL
    IMAGEKIT
    GOOGLE_OAUTH
  }

  enum LiteEmailStatus {
    SENT
    FAILED
    SKIPPED
  }

  type LiteAdminStats {
    users: Int!
    events: Int!
    published_events: Int!
    upcoming_events: Int!
    registrations: Int!
    confirmed_registrations: Int!
    revenue_confirmed: Int!
    calendars: Int!
    emails_sent_7d: Int!
  }

  type LiteAdminSettings {
    site_name: String!
    support_email: String!
    default_timezone: String!
    date_format: String!
    time_format: String!
    currency: String!
    sign_in_with_duncit: Boolean!
    "The main Duncit GraphQL endpoint a Duncit sign-in is proved against."
    duncit_graphql_url: String!
    duncit_app_url: String!
    reminders_enabled: Boolean!
    "Hours before start at which a reminder email goes out, e.g. [24, 1]."
    reminder_hours_before: [Int!]!
    upi_help_text: String!
    "Addresses that always sign in as admins, on top of the is_admin flag."
    admin_emails: [String!]!
    "Rupee ceiling on a single ticket price; 0 means no ceiling."
    max_ticket_price: Int!
  }

  input LiteAdminSettingsInput {
    site_name: String
    support_email: String
    default_timezone: String
    date_format: String
    time_format: String
    currency: String
    sign_in_with_duncit: Boolean
    duncit_graphql_url: String
    duncit_app_url: String
    reminders_enabled: Boolean
    reminder_hours_before: [Int!]
    upi_help_text: String
    admin_emails: [String!]
    max_ticket_price: Int
  }

  type LiteEnvFieldDef {
    name: String!
    label: String!
    secret: Boolean!
    number: Boolean!
    bool: Boolean!
    hint: String
  }

  type LiteEnvCategoryDef {
    category: LiteEnvCategory!
    label: String!
    fields: [LiteEnvFieldDef!]!
    docUrl: String
  }

  type LiteEnvPair {
    key: String!
    value: String!
  }

  type LiteEnvSecretFlag {
    key: String!
    present: Boolean!
  }

  type LiteEnvEntry {
    id: ID!
    name: String!
    category: LiteEnvCategory!
    description: String
    is_default: Boolean!
    is_active: Boolean!
    config: [LiteEnvPair!]!
    secrets: [LiteEnvSecretFlag!]!
    last_tested_at: String
    last_test_ok: Boolean
    created_at: String!
    updated_at: String!
  }

  input LiteEnvPairInput {
    key: String!
    value: String!
  }

  input LiteEnvEntryInput {
    name: String!
    category: LiteEnvCategory!
    description: String
    is_default: Boolean
    is_active: Boolean
    "Blank secrets are left as they are on update."
    config: [LiteEnvPairInput!]
  }

  type LiteEnvTestResult {
    ok: Boolean!
    message: String!
  }

  type LiteEmailTemplate {
    id: ID!
    "Stable key the server sends by, e.g. registration_confirmed."
    key: String!
    name: String!
    description: String!
    subject: String!
    "Plain text with {placeholders}; blank lines separate paragraphs."
    body: String!
    enabled: Boolean!
    "The placeholders this template may use."
    vars: [String!]!
    sent_count: Int!
    updated_at: String!
  }

  input LiteEmailTemplateInput {
    subject: String!
    body: String!
    enabled: Boolean!
  }

  type LiteEmailLog {
    id: ID!
    to: String!
    subject: String!
    template_key: String!
    status: LiteEmailStatus!
    error: String
    message_id: String
    created_at: String!
  }

  type LiteLocale {
    code: String!
    label: String!
    english_label: String!
    is_rtl: Boolean!
    is_default: Boolean!
    sort_order: Int!
    is_active: Boolean!
    translated_count: Int!
  }

  input LiteLocaleInput {
    code: String!
    label: String!
    english_label: String!
    is_rtl: Boolean
    is_default: Boolean
    sort_order: Int
    is_active: Boolean
  }

  type LiteTranslation {
    id: ID!
    key: String!
    locale: String!
    value: String!
    updated_at: String!
  }

  input LiteTranslationEntryInput {
    key: String!
    value: String!
  }

  type LiteImportResult {
    created: Int!
    skipped: Int!
  }

  type LiteEventTablePage {
    rows: [LiteEvent!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type LiteUserTablePage {
    rows: [LiteUser!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type LiteRegistrationTablePage {
    rows: [LiteRegistration!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type LiteCalendarTablePage {
    rows: [LiteCalendar!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type LiteEmailLogTablePage {
    rows: [LiteEmailLog!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type LiteTranslationTablePage {
    rows: [LiteTranslation!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input LiteCategoryInput {
    name: String!
    slug: String
    icon: String
    sort_order: Int
    is_active: Boolean
  }

  input LiteCityInput {
    name: String!
    slug: String
    country: String
    cover_url: String
    featured: Boolean
    sort_order: Int
    is_active: Boolean
  }

  "The shape @duncit/app-settings' LocaleProvider asks every Duncit API for."
  type PublicLocale {
    code: String!
    label: String!
    english_label: String!
    is_rtl: Boolean!
    is_default: Boolean!
    sort_order: Int!
  }

  type PublicTranslation {
    key: String!
    value: String!
  }

  "The shape @duncit/app-settings' useDateFormat asks every Duncit API for."
  type PublicAppSettings {
    date_format: String!
    time_format: String!
    time_zone: String!
    time_source: String!
    custom_time: String
    custom_time_set_at: String
    server_time: String!
    min_signup_age: Int!
    draft_retention_days: Int!
    ticket_discount_max_pct: Int!
  }

  extend type Query {
    publicLocales: [PublicLocale!]!
    publicTranslations(locale: String!): [PublicTranslation!]!
    publicAppSettings: PublicAppSettings!

    liteAdminStats: LiteAdminStats!
    liteAdminSettings: LiteAdminSettings!
    liteAdminEventsTable(query: TableQueryInput): LiteEventTablePage!
    liteAdminUsersTable(query: TableQueryInput): LiteUserTablePage!
    liteAdminRegistrationsTable(query: TableQueryInput): LiteRegistrationTablePage!
    liteAdminCalendarsTable(query: TableQueryInput): LiteCalendarTablePage!
    liteEnvEntries(category: LiteEnvCategory): [LiteEnvEntry!]!
    liteEnvCategories: [LiteEnvCategoryDef!]!
    liteEmailTemplates: [LiteEmailTemplate!]!
    liteEmailLogsTable(query: TableQueryInput): LiteEmailLogTablePage!
    liteLocales: [LiteLocale!]!
    liteTranslationsTable(locale: String!, query: TableQueryInput): LiteTranslationTablePage!
  }

  extend type Mutation {
    liteAdminUpdateSettings(input: LiteAdminSettingsInput!): LiteAdminSettings!
    liteAdminSetEventFlags(id: ID!, featured: Boolean, hidden: Boolean): LiteEvent!
    liteAdminCancelEvent(id: ID!, reason: String): LiteEvent!
    liteAdminSetUserFlags(id: ID!, is_admin: Boolean, is_blocked: Boolean): LiteUser!
    liteAdminSetCalendarFeatured(id: ID!, featured: Boolean!): LiteCalendar!
    liteUpsertCategory(id: ID, input: LiteCategoryInput!): LiteCategory!
    liteDeleteCategory(id: ID!): Boolean!
    liteUpsertCity(id: ID, input: LiteCityInput!): LiteCity!
    liteDeleteCity(id: ID!): Boolean!
    liteCreateEnvEntry(input: LiteEnvEntryInput!): LiteEnvEntry!
    liteUpdateEnvEntry(id: ID!, input: LiteEnvEntryInput!): LiteEnvEntry!
    liteDeleteEnvEntry(id: ID!): Boolean!
    liteSetDefaultEnvEntry(id: ID!): LiteEnvEntry!
    "Proves the entry: EMAIL sends a real message to \`to\`, the others check the key with the vendor."
    liteTestEnvEntry(id: ID!, to: String): LiteEnvTestResult!
    liteUpdateEmailTemplate(key: String!, input: LiteEmailTemplateInput!): LiteEmailTemplate!
    liteSendTestEmail(template_key: String!, to: String!): LiteEnvTestResult!
    liteUpsertLocale(input: LiteLocaleInput!): LiteLocale!
    liteDeleteLocale(code: String!): Boolean!
    liteSetTranslations(locale: String!, entries: [LiteTranslationEntryInput!]!): Int!
    liteDeleteTranslation(id: ID!): Boolean!
    "Seed the default locale with every key the web app ships, without overwriting a translated one."
    liteImportTranslationKeys(entries: [LiteTranslationEntryInput!]!): LiteImportResult!
  }
`;
