import { gql } from '@apollo/client';

export const INTEGRATION_FIELDS = `
  id name type description is_default is_active last_used_at created_at updated_at
  config {
    public_key url_endpoint client_id account_sid phone_number base_url model provider
    has_private_key has_api_key has_client_secret has_maps_api_key has_auth_token
  }
`;

export const INTEGRATION_PROVIDERS = gql`
  query IntegrationProviders($filter: IntegrationProviderFilter) {
    integrationProviders(filter: $filter) { ${INTEGRATION_FIELDS} }
  }
`;

export const CREATE_INTEGRATION_PROVIDER = gql`
  mutation CreateIntegrationProvider($input: CreateIntegrationProviderInput!) {
    createIntegrationProvider(input: $input) { ${INTEGRATION_FIELDS} }
  }
`;

export const UPDATE_INTEGRATION_PROVIDER = gql`
  mutation UpdateIntegrationProvider($id: ID!, $input: UpdateIntegrationProviderInput!) {
    updateIntegrationProvider(id: $id, input: $input) { ${INTEGRATION_FIELDS} }
  }
`;

export const DELETE_INTEGRATION_PROVIDER = gql`
  mutation DeleteIntegrationProvider($id: ID!) { deleteIntegrationProvider(id: $id) }
`;

export const SET_DEFAULT_INTEGRATION_PROVIDER = gql`
  mutation SetDefaultIntegrationProvider($id: ID!) {
    setDefaultIntegrationProvider(id: $id) { ${INTEGRATION_FIELDS} }
  }
`;

export const TEST_INTEGRATION_PROVIDER = gql`
  mutation TestIntegrationProvider($id: ID!) {
    testIntegrationProvider(id: $id) { ok message }
  }
`;

export type IntegrationProviderType = 'IMAGEKIT' | 'PEXELS' | 'GOOGLE' | 'TWILIO' | 'AI';

export interface IntegrationConfig {
  public_key: string | null;
  url_endpoint: string | null;
  client_id: string | null;
  account_sid: string | null;
  phone_number: string | null;
  base_url: string | null;
  model: string | null;
  provider: string | null;
  has_private_key: boolean;
  has_api_key: boolean;
  has_client_secret: boolean;
  has_maps_api_key: boolean;
  has_auth_token: boolean;
}

export interface IntegrationProvider {
  id: string;
  name: string;
  type: IntegrationProviderType;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  config: IntegrationConfig;
}
