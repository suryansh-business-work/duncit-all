import { gql } from '@apollo/client';
import * as yup from 'yup';

export const ENVIRONMENT_VARIABLES = gql`
  query EnvironmentVariables {
    environmentVariables {
      group
      app
      key
      label
      value
      is_secret
      has_override
      has_fallback
      source
      updated_at
    }
  }
`;

export const UPDATE_ENVIRONMENT_VARIABLE = gql`
  mutation UpdateEnvironmentVariable($key: String!, $value: String!) {
    updateEnvironmentVariable(key: $key, value: $value) {
      key
      value
      has_override
      source
      updated_at
    }
  }
`;

export const CLEAR_ENVIRONMENT_VARIABLE = gql`
  mutation ClearEnvironmentVariable($key: String!) {
    clearEnvironmentVariable(key: $key) {
      key
      value
      has_override
      source
      updated_at
    }
  }
`;

export interface EnvironmentVariableRow {
  group: string;
  app: string;
  key: string;
  label: string;
  value: string;
  is_secret: boolean;
  has_override: boolean;
  has_fallback: boolean;
  source: 'DATABASE' | 'ENV' | 'EMPTY';
  updated_at?: string | null;
}

export const environmentVariableSchema = yup.object({
  key: yup.string().trim().required(),
  value: yup.string().required('Value is required'),
});