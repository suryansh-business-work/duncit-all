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
  'TURN',
  'GITHUB',
  'GOOGLE_PLAY',
  'MSG91',
  'APPLE_SIGNIN',
  'APP_STORE_CONNECT',
  'SONARQUBE',
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
    TURN
    GITHUB
    GOOGLE_PLAY
    MSG91
    APPLE_SIGNIN
    APP_STORE_CONNECT
    SONARQUBE
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
    "Link to the provider's API documentation, when there is one worth reading."
    apiDocsUrl: String
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

  """
  One entry from an exported JSON file. There is no id: an export is moved
  BETWEEN environments, where ids mean nothing, so an entry is matched on the
  pair that names it — its category and its name.
  """
  input ImportEnvEntryInput {
    name: String!
    category: EnvCategory!
    description: String
    is_default: Boolean
    is_active: Boolean
    assigned_portals: [String!]
    config: [EnvConfigPairInput!]!
  }

  """
  What an import did. Entries are reported by name so an operator can see
  which credentials were overwritten, and skipped names say what the file
  asked for that this server does not have (an unknown category, or no name).
  """
  type EnvImportResult {
    created: [String!]!
    updated: [String!]!
    skipped: [String!]!
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

  """
  The outcome of proving one entry's credentials against its vendor.

  The details list carries everything that is not the headline — granted
  scopes, live-vs-test mode, how long a token lasts. Neither field ever
  contains a credential; both are shown in the portal and kept in the
  entry's test history.
  """
  type EnvConnectionTestResult {
    ok: Boolean!
    message: String!
    details: [String!]!
  }

  "One call of MSG91's OTP widget, run from the Tech portal against a saved entry."
  enum EnvMsg91TestAction {
    "Send a REAL SMS code to the number — answers with the request id."
    SEND_OTP
    "Re-send the code of a live request, optionally over another channel."
    RETRY_OTP
    "Check a code against a request id — answers with MSG91's access token."
    VERIFY_OTP
    "Ask MSG91 whether an access token from VERIFY_OTP is one it issued."
    VERIFY_ACCESS_TOKEN
  }

  input EnvMsg91TestInput {
    action: EnvMsg91TestAction!
    "Country code, e.g. +91 — SEND_OTP only."
    phone_extension: String
    "The number without its country code — SEND_OTP only."
    phone_number: String
    "The request id SEND_OTP answered with — RETRY_OTP and VERIFY_OTP."
    req_id: String
    "The code that arrived — VERIFY_OTP only."
    otp: String
    "MSG91 channel code for RETRY_OTP: 11 SMS, 4 voice, 3 email, 12 WhatsApp. Blank uses the widget's own."
    retry_channel: Int
    "The token VERIFY_OTP answered with — VERIFY_ACCESS_TOKEN only."
    access_token: String
  }

  input EnvConnectionTestInput {
    """
    Where a provider whose only real credential check is a live send should
    send it (today: AiSensy). Country code + number, digits only. Left blank,
    the signed-in admin's own profile phone is used.
    """
    to: String
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

    """
    Restore entries from an exported JSON file, matching on category + name:
    a name this server already has is updated in place, a new one is created.

    Blank secrets are left alone rather than written, which is what makes an
    export that was hand-edited safe to re-import — deleting a value from the
    file does not wipe the credential the server is running on.
    """
    importEnvEntries(entries: [ImportEnvEntryInput!]!): EnvImportResult!

    """
    Prove one entry's saved credentials against its vendor.

    Takes the ENTRY id rather than a category on purpose: a category can hold
    several entries and only one of them is the default, so a category-keyed
    test would report a credential the operator is not looking at. The category
    comes from the entry, which is what keeps this ONE mutation instead of a
    near-identical one per provider.

    Some of these perform a REAL action — AiSensy's key can make no call except
    sending, so testing it sends a WhatsApp message.
    """
    testEnvConnection(id: ID!, input: EnvConnectionTestInput): EnvConnectionTestResult!

    "Interactive tests — these perform REAL actions (send email, place calls, upload, AI calls)."
    testEnvEmail(id: ID!, to: String!): EnvTestRichResult!
    testEnvImagekitUpload(id: ID!, fileBase64: String!, fileName: String!): EnvTestRichResult!
    testEnvPexels(id: ID!, query: String!): EnvTestRichResult!
    testEnvTwilioCall(id: ID!, to: String!): EnvTestRichResult!
    testEnvOpenai(id: ID!, prompt: String!): EnvTestRichResult!
    testEnvGemini(id: ID!, prompt: String!): EnvTestRichResult!
    """
    One step of the MSG91 OTP widget with this entry's keys. SEND_OTP and
    RETRY_OTP deliver a real, billed message. The data field carries what the
    next step needs: the request id, or the access token.
    """
    testEnvMsg91(id: ID!, input: EnvMsg91TestInput!): EnvTestRichResult!
  }
`;
