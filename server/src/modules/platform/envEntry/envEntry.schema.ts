import gql from 'graphql-tag';
import { ENV_CATEGORIES } from './envEntry.model';

/**
 * The values are SPELLED OUT, not interpolated from ENV_CATEGORIES.
 *
 * They used to be interpolated, and it silently cost the whole module its
 * generated types: graphql-codegen's code-file loader plucks these template
 * literals WITHOUT evaluating them, so an interpolated enum body leaves a
 * document it cannot parse and every `Env*` type vanishes from
 * `@duncit/gql-types`. Nothing failed, because the committed copy predated the
 * interpolation — the next person to re-run codegen would simply have deleted
 * twenty types.
 *
 * The cost of spelling them out is drift, which is what the guard below is for:
 * a category added to the model and forgotten here throws the moment this
 * module is imported, so `check:schema` catches it rather than a request.
 */
const SDL_CATEGORIES = [
  'EMAIL',
  'IMAGEKIT',
  'PEXELS',
  'GOOGLE_OAUTH',
  'GOOGLE_MAPS',
  'TWILIO',
  'OPENAI',
  'GEMINI',
  'SERVAM',
  'RAZORPAY',
  'SHIPROCKET',
  'SLACK',
  'AISENSY',
  'RESEND',
  'LIVEKIT',
];

if (SDL_CATEGORIES.join(',') !== ENV_CATEGORIES.join(',')) {
  throw new Error(
    `EnvCategory drift: the SDL enum lists [${SDL_CATEGORIES.join(', ')}] but ENV_CATEGORIES ` +
      `is [${ENV_CATEGORIES.join(', ')}]. Update envEntry.schema.ts to match.`
  );
}

export const envEntryTypeDefs = gql`
  enum EnvCategory {
    EMAIL
    IMAGEKIT
    PEXELS
    GOOGLE_OAUTH
    GOOGLE_MAPS
    TWILIO
    OPENAI
    GEMINI
    SERVAM
    RAZORPAY
    SHIPROCKET
    SLACK
    AISENSY
    RESEND
    LIVEKIT
  }

  type EnvConfigPair {
    key: String!
    value: String!
  }

  type EnvSecretFlag {
    key: String!
    present: Boolean!
  }

  "A category field definition so the UI can render the right inputs dynamically."
  type EnvFieldDef {
    name: String!
    label: String!
    secret: Boolean!
    number: Boolean!
    bool: Boolean!
    phone: Boolean!
    hint: String
  }

  type EnvCategoryDef {
    category: EnvCategory!
    label: String!
    fields: [EnvFieldDef!]!
    "Link to where an operator obtains these credentials."
    docUrl: String
  }

  type EnvEntry {
    id: ID!
    name: String!
    category: EnvCategory!
    description: String
    is_default: Boolean!
    is_active: Boolean!
    assigned_portals: [String!]!
    config: [EnvConfigPair!]!
    secrets: [EnvSecretFlag!]!
    last_used_at: String
    last_tested_at: String
    last_test_ok: Boolean
    created_at: String
    updated_at: String
  }

  input EnvConfigPairInput {
    key: String!
    value: String!
  }

  input CreateEnvEntryInput {
    name: String!
    category: EnvCategory!
    description: String
    is_default: Boolean
    is_active: Boolean
    config: [EnvConfigPairInput!]
    assigned_portals: [String!]
  }

  input UpdateEnvEntryInput {
    name: String
    description: String
    is_default: Boolean
    is_active: Boolean
    config: [EnvConfigPairInput!]
    assigned_portals: [String!]
  }

  input EnvEntryFilter {
    category: EnvCategory
    is_active: Boolean
  }

  "Server-side table page for the shared table engine (envEntriesTable)."
  type EnvEntryTablePage {
    rows: [EnvEntry!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  type EnvTestResult {
    ok: Boolean!
    message: String!
  }

  "Richer result for the interactive per-category tests (returns a URL or data payload)."
  type EnvTestRichResult {
    ok: Boolean!
    message: String!
    url: String
    data: String
  }

  extend type Query {
    envEntries(filter: EnvEntryFilter): [EnvEntry!]!
    envEntriesTable(query: TableQueryInput): EnvEntryTablePage!
    envEntry(id: ID!): EnvEntry
    envCategories: [EnvCategoryDef!]!
    "Entries currently assigned to a portal (by portal key)."
    envEntriesForPortal(portalKey: String!): [EnvEntry!]!
  }

  extend type Mutation {
    createEnvEntry(input: CreateEnvEntryInput!): EnvEntry!
    updateEnvEntry(id: ID!, input: UpdateEnvEntryInput!): EnvEntry!
    deleteEnvEntry(id: ID!): Boolean!
    setDefaultEnvEntry(id: ID!): EnvEntry!
    testEnvEntry(id: ID!): EnvTestResult!
    "Replace the full set of entries assigned to a portal."
    setPortalEnvEntries(portalKey: String!, entryIds: [ID!]!): [EnvEntry!]!

    "Interactive tests — these perform REAL actions (send email, place calls, upload, AI calls)."
    testEnvEmail(id: ID!, to: String!): EnvTestRichResult!
    testEnvImagekitUpload(id: ID!, fileBase64: String!, fileName: String!): EnvTestRichResult!
    testEnvPexels(id: ID!, query: String!): EnvTestRichResult!
    testEnvTwilioCall(id: ID!, to: String!): EnvTestRichResult!
    testEnvOpenai(id: ID!, prompt: String!): EnvTestRichResult!
    testEnvGemini(id: ID!, prompt: String!): EnvTestRichResult!
  }
`;
