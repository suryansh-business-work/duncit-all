import { gql } from '@apollo/client';
import type { TestsSettings } from '@duncit/gql-types';

const SETTINGS_FIELDS = `weights { signal weight } high_min medium_min regression_penalty updated_by updated_at`;

export const TESTS_SETTINGS = gql`
  query TestsSettings {
    testsSettings { ${SETTINGS_FIELDS} }
  }
`;

export const UPDATE_TESTS_SETTINGS = gql`
  mutation UpdateTestsSettings($input: UpdateTestsSettingsInput!) {
    updateTestsSettings(input: $input) { ${SETTINGS_FIELDS} }
  }
`;

/** Both documents select every field of the type, so the generated type is exact. */
export interface TestsSettingsData {
  testsSettings: TestsSettings;
}

export interface UpdateTestsSettingsData {
  updateTestsSettings: TestsSettings;
}
