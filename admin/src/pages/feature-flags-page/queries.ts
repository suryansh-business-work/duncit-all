import { gql } from '@apollo/client';

export const QUERY = gql`
  query FeatureFlags {
    featureFlags {
      id
      key
      name
      description
      enabled
      is_system
      updated_at
    }
  }
`;
export const SET_FLAG = gql`
  mutation SetFlag($flag_id: ID!, $enabled: Boolean!) {
    setFeatureFlag(flag_id: $flag_id, enabled: $enabled) {
      id
      enabled
    }
  }
`;
export const CREATE_FLAG = gql`
  mutation CreateFlag($input: CreateFeatureFlagInput!) {
    createFeatureFlag(input: $input) {
      id
    }
  }
`;
export const UPDATE_FLAG = gql`
  mutation UpdateFlag($flag_id: ID!, $input: UpdateFeatureFlagInput!) {
    updateFeatureFlag(flag_id: $flag_id, input: $input) {
      id
    }
  }
`;
export const DELETE_FLAG = gql`
  mutation DeleteFlag($flag_id: ID!) {
    deleteFeatureFlag(flag_id: $flag_id)
  }
`;

export interface FlagEdit {
  id?: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
}

export const blankFlag: FlagEdit = { key: '', name: '', description: '', enabled: false };
