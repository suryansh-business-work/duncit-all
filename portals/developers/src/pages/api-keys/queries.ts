import { gql } from '@apollo/client';

export const MY_API_KEYS = gql`
  query MyApiKeys {
    myApiKeys {
      id
      name
      key_prefix
      scopes
      last_used_at
      revoked_at
      created_at
    }
  }
`;

export const CREATE_API_KEY = gql`
  mutation CreateApiKey($name: String!) {
    createApiKey(name: $name) {
      raw_key
      api_key {
        id
        name
        key_prefix
        scopes
        created_at
        revoked_at
        last_used_at
      }
    }
  }
`;

export const REVOKE_API_KEY = gql`
  mutation RevokeApiKey($id: ID!) {
    revokeApiKey(id: $id) {
      id
      revoked_at
    }
  }
`;

export interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}
