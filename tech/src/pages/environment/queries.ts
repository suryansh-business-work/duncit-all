import { gql } from '@apollo/client';

export const ENV_ENTRY_FIELDS = `
  id name category description is_default is_active assigned_portals
  config { key value }
  secrets { key present }
  last_used_at created_at updated_at
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
export const TEST_ENV_AI = gql`
  mutation TestEnvAi($id: ID!, $provider: AiTestProvider!, $prompt: String!) {
    testEnvAi(id: $id, provider: $provider, prompt: $prompt) ${RICH}
  }
`;

export interface RichTestResult {
  ok: boolean;
  message: string;
  url?: string | null;
  data?: string | null;
}

export type EnvCategory = 'EMAIL' | 'IMAGEKIT' | 'PEXELS' | 'GOOGLE' | 'TWILIO' | 'AI' | 'VOBIZ';

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
  created_at: string | null;
  updated_at: string | null;
}
