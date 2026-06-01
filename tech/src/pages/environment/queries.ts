import { gql } from '@apollo/client';

export const ENV_ENTRY_FIELDS = `
  id name category description is_default is_active assigned_portals
  config { key value }
  secrets { key present }
  last_used_at last_tested_at last_test_ok created_at updated_at
`;

export const ENV_CATEGORIES = gql`
  query EnvCategories {
    envCategories {
      category
      label
      fields { name label secret number bool }
    }
  }
`;

export const ENV_ENTRIES = gql`
  query EnvEntries($filter: EnvEntryFilter) {
    envEntries(filter: $filter) { ${ENV_ENTRY_FIELDS} }
  }
`;

export const CREATE_ENV_ENTRY = gql`
  mutation CreateEnvEntry($input: CreateEnvEntryInput!) {
    createEnvEntry(input: $input) { ${ENV_ENTRY_FIELDS} }
  }
`;

export const UPDATE_ENV_ENTRY = gql`
  mutation UpdateEnvEntry($id: ID!, $input: UpdateEnvEntryInput!) {
    updateEnvEntry(id: $id, input: $input) { ${ENV_ENTRY_FIELDS} }
  }
`;

export const DELETE_ENV_ENTRY = gql`
  mutation DeleteEnvEntry($id: ID!) { deleteEnvEntry(id: $id) }
`;

export const SET_DEFAULT_ENV_ENTRY = gql`
  mutation SetDefaultEnvEntry($id: ID!) {
    setDefaultEnvEntry(id: $id) { ${ENV_ENTRY_FIELDS} }
  }
`;

export const TEST_ENV_ENTRY = gql`
  mutation TestEnvEntry($id: ID!) {
    testEnvEntry(id: $id) { ok message }
  }
`;

const RICH = `{ ok message url data }`;

export const TEST_ENV_EMAIL = gql`
  mutation TestEnvEmail($id: ID!, $to: String!) { testEnvEmail(id: $id, to: $to) ${RICH} }
`;
export const TEST_ENV_IMAGEKIT = gql`
  mutation TestEnvImagekit($id: ID!, $fileBase64: String!, $fileName: String!) {
    testEnvImagekitUpload(id: $id, fileBase64: $fileBase64, fileName: $fileName) ${RICH}
  }
`;
export const TEST_ENV_PEXELS = gql`
  mutation TestEnvPexels($id: ID!, $query: String!) { testEnvPexels(id: $id, query: $query) ${RICH} }
`;
export const TEST_ENV_TWILIO = gql`
  mutation TestEnvTwilio($id: ID!, $to: String!) { testEnvTwilioCall(id: $id, to: $to) ${RICH} }
`;
export const TEST_ENV_VOBIZ = gql`
  mutation TestEnvVobiz($id: ID!, $to: String!) { testEnvVobizCall(id: $id, to: $to) ${RICH} }
`;
export const TEST_ENV_OPENAI = gql`
  mutation TestEnvOpenai($id: ID!, $prompt: String!) { testEnvOpenai(id: $id, prompt: $prompt) ${RICH} }
`;
export const TEST_ENV_GEMINI = gql`
  mutation TestEnvGemini($id: ID!, $prompt: String!) { testEnvGemini(id: $id, prompt: $prompt) ${RICH} }
`;

export interface RichTestResult {
  ok: boolean;
  message: string;
  url?: string | null;
  data?: string | null;
}

export type EnvCategory =
  | 'EMAIL'
  | 'IMAGEKIT'
  | 'PEXELS'
  | 'GOOGLE_OAUTH'
  | 'GOOGLE_MAPS'
  | 'TWILIO'
  | 'OPENAI'
  | 'GEMINI'
  | 'VOBIZ';

export interface EnvFieldDef {
  name: string;
  label: string;
  secret: boolean;
  number: boolean;
  bool: boolean;
}

export interface EnvCategoryDef {
  category: EnvCategory;
  label: string;
  fields: EnvFieldDef[];
}

const f = (name: string, label: string, extra: Partial<EnvFieldDef> = {}): EnvFieldDef => ({
  name,
  label,
  secret: false,
  number: false,
  bool: false,
  ...extra,
});

/**
 * Static category definitions (tabs + form fields) mirroring the server's
 * CATEGORY_FIELDS. Used so the tabs, the Add button and the form ALWAYS work,
 * even while the envCategories query is loading or the API is briefly
 * unavailable (e.g. during a deploy). The query, when present, overrides this.
 */
export const CATEGORY_DEFS: EnvCategoryDef[] = [
  {
    category: 'EMAIL',
    label: 'Email (SMTP)',
    fields: [
      f('host', 'SMTP Host'),
      f('port', 'Port', { number: true }),
      f('user', 'Username'),
      f('password', 'Password', { secret: true }),
      f('secure', 'Use TLS', { bool: true }),
      f('from_address', 'From Address'),
      f('from_name', 'From Name'),
      f('reply_to', 'Reply-To'),
    ],
  },
  {
    category: 'IMAGEKIT',
    label: 'ImageKit',
    fields: [f('public_key', 'Public Key'), f('private_key', 'Private Key', { secret: true }), f('url_endpoint', 'URL Endpoint')],
  },
  { category: 'PEXELS', label: 'Pexels', fields: [f('api_key', 'API Key', { secret: true })] },
  {
    category: 'GOOGLE_OAUTH',
    label: 'Google OAuth',
    fields: [f('client_id', 'OAuth Client ID'), f('client_secret', 'OAuth Client Secret', { secret: true })],
  },
  { category: 'GOOGLE_MAPS', label: 'Google Map', fields: [f('maps_api_key', 'Maps API Key', { secret: true })] },
  {
    category: 'TWILIO',
    label: 'Twilio',
    fields: [f('account_sid', 'Account SID'), f('auth_token', 'Auth Token', { secret: true }), f('phone_number', 'Phone Number')],
  },
  {
    category: 'OPENAI',
    label: 'OpenAI',
    fields: [f('base_url', 'Base URL (optional)'), f('model', 'Model (default gpt-4o-mini)'), f('api_key', 'API Key', { secret: true })],
  },
  {
    category: 'GEMINI',
    label: 'Gemini',
    fields: [f('model', 'Model (default gemini-1.5-flash)'), f('api_key', 'API Key', { secret: true })],
  },
  {
    category: 'VOBIZ',
    label: 'Vobiz',
    fields: [
      f('base_url', 'API Base URL'),
      f('api_key', 'API Key', { secret: true }),
      f('sender_email', 'Sender Email'),
      f('sender_name', 'Sender Name'),
      f('caller_id', 'Caller ID / From Number'),
    ],
  },
];

export interface EnvEntry {
  id: string;
  name: string;
  category: EnvCategory;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  assigned_portals: string[];
  config: { key: string; value: string }[];
  secrets: { key: string; present: boolean }[];
  last_used_at: string | null;
  last_tested_at: string | null;
  last_test_ok: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}
