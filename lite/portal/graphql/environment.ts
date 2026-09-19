import { gql } from '@apollo/client';

export type LiteEnvCategory = 'EMAIL' | 'IMAGEKIT' | 'GOOGLE_OAUTH';

export interface LiteEnvFieldDef {
  name: string;
  label: string;
  secret: boolean;
  number: boolean;
  bool: boolean;
  hint: string | null;
}

export interface LiteEnvCategoryDef {
  category: LiteEnvCategory;
  label: string;
  fields: LiteEnvFieldDef[];
  docUrl: string | null;
}

export interface LiteEnvEntry {
  id: string;
  name: string;
  category: LiteEnvCategory;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  config: { key: string; value: string }[];
  secrets: { key: string; present: boolean }[];
  last_tested_at: string | null;
  last_test_ok: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface LiteEnvEntryInput {
  name: string;
  category: LiteEnvCategory;
  description?: string;
  is_default?: boolean;
  is_active?: boolean;
  config?: { key: string; value: string }[];
}

export interface LiteEnvTestResult {
  ok: boolean;
  message: string;
}

const ENV_ENTRY_FIELDS = gql`
  fragment LiteEnvEntryFields on LiteEnvEntry {
    id
    name
    category
    description
    is_default
    is_active
    config {
      key
      value
    }
    secrets {
      key
      present
    }
    last_tested_at
    last_test_ok
    created_at
    updated_at
  }
`;

export const LITE_ENV_CATEGORIES = gql`
  query LiteEnvCategories {
    liteEnvCategories {
      category
      label
      docUrl
      fields {
        name
        label
        secret
        number
        bool
        hint
      }
    }
  }
`;

export const LITE_ENV_ENTRIES = gql`
  query LiteEnvEntries($category: LiteEnvCategory) {
    liteEnvEntries(category: $category) {
      ...LiteEnvEntryFields
    }
  }
  ${ENV_ENTRY_FIELDS}
`;

export const LITE_CREATE_ENV_ENTRY = gql`
  mutation LiteCreateEnvEntry($input: LiteEnvEntryInput!) {
    liteCreateEnvEntry(input: $input) {
      ...LiteEnvEntryFields
    }
  }
  ${ENV_ENTRY_FIELDS}
`;

export const LITE_UPDATE_ENV_ENTRY = gql`
  mutation LiteUpdateEnvEntry($id: ID!, $input: LiteEnvEntryInput!) {
    liteUpdateEnvEntry(id: $id, input: $input) {
      ...LiteEnvEntryFields
    }
  }
  ${ENV_ENTRY_FIELDS}
`;

export const LITE_DELETE_ENV_ENTRY = gql`
  mutation LiteDeleteEnvEntry($id: ID!) {
    liteDeleteEnvEntry(id: $id)
  }
`;

export const LITE_SET_DEFAULT_ENV_ENTRY = gql`
  mutation LiteSetDefaultEnvEntry($id: ID!) {
    liteSetDefaultEnvEntry(id: $id) {
      ...LiteEnvEntryFields
    }
  }
  ${ENV_ENTRY_FIELDS}
`;

export const LITE_TEST_ENV_ENTRY = gql`
  mutation LiteTestEnvEntry($id: ID!, $to: String) {
    liteTestEnvEntry(id: $id, to: $to) {
      ok
      message
    }
  }
`;
