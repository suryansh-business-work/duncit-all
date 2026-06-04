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
      docUrl
      fields { name label secret number bool phone hint }
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
  | 'SERVAM';

export interface EnvFieldDef {
  name: string;
  label: string;
  secret: boolean;
  number: boolean;
  bool: boolean;
  phone?: boolean;
  hint?: string | null;
}

export interface EnvCategoryDef {
  category: EnvCategory;
  label: string;
  fields: EnvFieldDef[];
  docUrl?: string | null;
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
    docUrl: 'https://support.google.com/a/answer/176600',
    fields: [
      f('host', 'SMTP Host', { hint: 'e.g. smtp.gmail.com' }),
      f('port', 'Port', { number: true, hint: '465 (SSL) or 587 (TLS)' }),
      f('user', 'Username', { hint: 'Full mailbox address' }),
      f('password', 'Password', { secret: true, hint: 'SMTP password or app password' }),
      f('secure', 'Use TLS', { bool: true }),
      f('from_address', 'From Address', { hint: 'no-reply@yourdomain.com' }),
      f('from_name', 'From Name'),
      f('reply_to', 'Reply-To'),
    ],
  },
  {
    category: 'IMAGEKIT',
    label: 'ImageKit',
    docUrl: 'https://imagekit.io/dashboard/developer/api-keys',
    fields: [
      f('public_key', 'Public Key', { hint: 'public_xxxxxxxxxxxxxxxx' }),
      f('private_key', 'Private Key', { secret: true, hint: 'private_xxxxxxxxxxxxxxxx' }),
      f('url_endpoint', 'URL Endpoint', { hint: 'https://ik.imagekit.io/your_id' }),
    ],
  },
  {
    category: 'PEXELS',
    label: 'Pexels',
    docUrl: 'https://www.pexels.com/api/',
    fields: [f('api_key', 'API Key', { secret: true, hint: '56-char alphanumeric key' })],
  },
  {
    category: 'GOOGLE_OAUTH',
    label: 'Google OAuth',
    docUrl: 'https://console.cloud.google.com/apis/credentials',
    fields: [
      f('client_id', 'OAuth Client ID', { hint: 'xxxxxx.apps.googleusercontent.com' }),
      f('client_secret', 'OAuth Client Secret', { secret: true, hint: 'GOCSPX-xxxxxxxxxxxxxxxx' }),
    ],
  },
  {
    category: 'GOOGLE_MAPS',
    label: 'Google Map',
    docUrl: 'https://console.cloud.google.com/google/maps-apis/credentials',
    fields: [f('maps_api_key', 'Maps API Key', { secret: true, hint: 'AIzaSy... (39 chars)' })],
  },
  {
    category: 'TWILIO',
    label: 'Twilio',
    docUrl: 'https://console.twilio.com/',
    fields: [
      f('account_sid', 'Account SID', { hint: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' }),
      f('auth_token', 'Auth Token', { secret: true, hint: '32-char hex token' }),
      f('phone_number', 'Phone Number', { phone: true, hint: 'E.164, e.g. +14155552671 — caller ID for outbound calls' }),
      f('agent_phone_number', 'Agent Phone Number (optional)', { phone: true, hint: 'Fallback agent leg for Call Through Portal; the logged-in user’s own phone is used first' }),
    ],
  },
  {
    category: 'OPENAI',
    label: 'OpenAI',
    docUrl: 'https://platform.openai.com/api-keys',
    fields: [
      f('base_url', 'Base URL (optional)', { hint: 'https://api.openai.com/v1' }),
      f('model', 'Model (default gpt-4o-mini)', { hint: 'e.g. gpt-4o-mini' }),
      f('api_key', 'API Key', { secret: true, hint: 'sk-proj-... or sk-...' }),
    ],
  },
  {
    category: 'GEMINI',
    label: 'Gemini',
    docUrl: 'https://aistudio.google.com/app/apikey',
    fields: [
      f('model', 'Model (default gemini-1.5-flash)', { hint: 'e.g. gemini-1.5-flash' }),
      f('api_key', 'API Key', { secret: true, hint: 'AIzaSy... (39 chars)' }),
    ],
  },
  {
    category: 'SERVAM',
    label: 'Servam AI (Sarvam)',
    docUrl: 'https://dashboard.sarvam.ai/admin',
    fields: [
      f('api_key', 'API Key', { secret: true, hint: 'Sarvam subscription key (sk_...)' }),
      f('base_url', 'Base URL (optional)', { hint: 'https://api.sarvam.ai' }),
      f('tts_model', 'TTS Model (default bulbul:v2)', { hint: 'e.g. bulbul:v2' }),
      f('default_voice', 'Default Voice', { hint: 'e.g. anushka, manisha, vidya, arya, abhilash, karun, hitesh' }),
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
