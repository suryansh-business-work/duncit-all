import { gql } from '@apollo/client';

const CONNECTION_FIELDS = gql`
  fragment WaConnectionFields on WaConnection {
    base_url
    session_id
    has_api_key
    status
    phone
    last_error
    connected_at
  }
`;

export const WA_CONNECTION = gql`
  ${CONNECTION_FIELDS}
  query WaConnection {
    waConnection {
      ...WaConnectionFields
    }
  }
`;

export const WA_STATUS = gql`
  ${CONNECTION_FIELDS}
  query WaStatus {
    waStatus {
      ...WaConnectionFields
    }
  }
`;

export const WA_QR = gql`
  query WaQr {
    waQr {
      qr_code
      status
    }
  }
`;

export const WA_SAVE_CONFIG = gql`
  ${CONNECTION_FIELDS}
  mutation WaSaveConfig($input: WaConfigInput!) {
    waSaveConfig(input: $input) {
      ...WaConnectionFields
    }
  }
`;

export const WA_CONNECT = gql`
  ${CONNECTION_FIELDS}
  mutation WaConnect {
    waConnect {
      ...WaConnectionFields
    }
  }
`;

export const WA_DISCONNECT = gql`
  ${CONNECTION_FIELDS}
  mutation WaDisconnect {
    waDisconnect {
      ...WaConnectionFields
    }
  }
`;

export interface WaConnection {
  base_url: string;
  session_id: string;
  has_api_key: boolean;
  status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'ERROR';
  phone?: string | null;
  last_error?: string | null;
  connected_at?: string | null;
}

export const WA_COMMUNITIES = gql`
  query WaCommunities {
    waCommunities {
      id
      community_jid
      name
      groups_count
    }
  }
`;

export const WA_GROUPS = gql`
  query WaGroups($community_jid: String) {
    waGroups(community_jid: $community_jid) {
      id
      group_jid
      name
      community_jid
      members_count
    }
  }
`;

export const WA_CONTACTS = gql`
  query WaContacts($search: String) {
    waContacts(search: $search) {
      id
      contact_jid
      phone
      name
      push_name
      is_business
    }
  }
`;

export const WA_GROUP_MEMBERS = gql`
  query WaGroupMembers($group_jid: String!) {
    waGroupMembers(group_jid: $group_jid) {
      jid
      phone
      name
      is_business
    }
  }
`;

export const WA_USER_LEADS = gql`
  query WaUserLeads($search: String) {
    waUserLeads(search: $search) {
      id
      phone
      name
      source_account
      source_communities {
        jid
        name
      }
      source_groups {
        jid
        name
      }
      imported_at
    }
  }
`;

export const WA_USER_LEAD = gql`
  query WaUserLead($id: ID!) {
    waUserLead(id: $id) {
      id
      phone
      name
      contact_jid
      source_account
      source_communities {
        jid
        name
      }
      source_groups {
        jid
        name
      }
      imported_at
    }
  }
`;

export const WA_REFRESH = gql`
  mutation WaRefresh {
    waRefresh {
      communities
      groups
      contacts
      leads
    }
  }
`;

export const WA_CREATE_USER_LEAD = gql`
  mutation WaCreateUserLead($input: WaCreateUserLeadInput!) {
    waCreateUserLead(input: $input) {
      id
      phone
      name
    }
  }
`;

export const WA_IMPORT_USER_LEADS = gql`
  mutation WaImportUserLeads($file_base64: String!) {
    waImportUserLeads(file_base64: $file_base64) {
      imported
      skipped
    }
  }
`;

export const WA_EXPORT_USER_LEADS = gql`
  query WaExportUserLeads($search: String) {
    waExportUserLeads(search: $search)
  }
`;
