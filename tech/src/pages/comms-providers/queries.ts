import { gql } from '@apollo/client';

export const COMMS_PROVIDER_FIELDS = `
  id name type description is_default is_active last_used_at created_at updated_at
  config {
    host port user secure from_address from_name reply_to
    base_url sender_email sender_name caller_id
    has_password has_api_key
  }
`;

export const COMMS_PROVIDERS = gql`
  query CommsProviders($filter: CommsProviderFilter) {
    commsProviders(filter: $filter) { ${COMMS_PROVIDER_FIELDS} }
  }
`;

export const CREATE_COMMS_PROVIDER = gql`
  mutation CreateCommsProvider($input: CreateCommsProviderInput!) {
    createCommsProvider(input: $input) { ${COMMS_PROVIDER_FIELDS} }
  }
`;

export const UPDATE_COMMS_PROVIDER = gql`
  mutation UpdateCommsProvider($id: ID!, $input: UpdateCommsProviderInput!) {
    updateCommsProvider(id: $id, input: $input) { ${COMMS_PROVIDER_FIELDS} }
  }
`;

export const DELETE_COMMS_PROVIDER = gql`
  mutation DeleteCommsProvider($id: ID!) { deleteCommsProvider(id: $id) }
`;

export const SET_DEFAULT_COMMS_PROVIDER = gql`
  mutation SetDefaultCommsProvider($id: ID!) {
    setDefaultCommsProvider(id: $id) { ${COMMS_PROVIDER_FIELDS} }
  }
`;

export const TEST_COMMS_PROVIDER = gql`
  mutation TestCommsProvider($id: ID!, $recipient: String!) {
    testCommsProvider(id: $id, recipient: $recipient) { ok message }
  }
`;

export type CommsProviderType = 'SMTP' | 'VOBIZ_EMAIL' | 'VOBIZ_CALL';

export interface CommsProvider {
  id: string;
  name: string;
  type: CommsProviderType;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  config: {
    host: string | null;
    port: number | null;
    user: string | null;
    secure: boolean;
    from_address: string | null;
    from_name: string | null;
    reply_to: string | null;
    base_url: string | null;
    sender_email: string | null;
    sender_name: string | null;
    caller_id: string | null;
    has_password: boolean;
    has_api_key: boolean;
  };
}
