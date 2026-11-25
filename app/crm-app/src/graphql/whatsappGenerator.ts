import { gql } from '@/generated/graphql';

/**
 * CRM › Tools › WhatsApp Lead Generator — the portal page's own operations:
 * the gateway connection (URL + API key, link, QR, disconnect), the
 * Communities / Groups / Users browser, a group's members, and the background
 * extraction. The API key is never selected: the server keeps it.
 */
export const CrmAppWhatsappConnectionDocument = gql(`
  query CrmAppWhatsappConnection {
    waConnection { base_url has_api_key status phone last_error connected_at }
  }
`);

export const CrmAppWhatsappStatusDocument = gql(`
  query CrmAppWhatsappStatus {
    waStatus { status }
  }
`);

export const CrmAppWhatsappQrDocument = gql(`
  query CrmAppWhatsappQr {
    waQr { qr_code }
  }
`);

export const CrmAppWhatsappSaveConfigDocument = gql(`
  mutation CrmAppWhatsappSaveConfig($input: WaConfigInput!) {
    waSaveConfig(input: $input) { status }
  }
`);

export const CrmAppWhatsappGenerateApiKeyDocument = gql(`
  mutation CrmAppWhatsappGenerateApiKey($base_url: String) {
    waGenerateApiKey(base_url: $base_url) { connection { has_api_key } }
  }
`);

export const CrmAppWhatsappConnectDocument = gql(`
  mutation CrmAppWhatsappConnect($restart: Boolean) {
    waConnect(restart: $restart) { status }
  }
`);

export const CrmAppWhatsappDisconnectDocument = gql(`
  mutation CrmAppWhatsappDisconnect {
    waDisconnect { status }
  }
`);

export const CrmAppWhatsappCommunitiesDocument = gql(`
  query CrmAppWhatsappCommunities($input: WaPageInput) {
    waCommunities(input: $input) { total items { id community_jid name groups_count } }
  }
`);

export const CrmAppWhatsappGroupsDocument = gql(`
  query CrmAppWhatsappGroups($input: WaPageInput) {
    waGroups(input: $input) { total items { id group_jid name } }
  }
`);

export const CrmAppWhatsappContactsDocument = gql(`
  query CrmAppWhatsappContacts($input: WaPageInput) {
    waContacts(input: $input) { total items { id phone name is_business } }
  }
`);

export const CrmAppWhatsappGroupMembersDocument = gql(`
  query CrmAppWhatsappGroupMembers($group_jid: String!) {
    waGroupMembers(group_jid: $group_jid) { jid phone name is_business }
  }
`);

export const CrmAppWhatsappExtractionDocument = gql(`
  query CrmAppWhatsappExtraction {
    waExtraction {
      id status total processed valid invalid duplicates communities groups leads_created error
    }
  }
`);

export const CrmAppWhatsappStartExtractionDocument = gql(`
  mutation CrmAppWhatsappStartExtraction {
    waStartExtraction { id }
  }
`);

export const CrmAppWhatsappCancelExtractionDocument = gql(`
  mutation CrmAppWhatsappCancelExtraction {
    waCancelExtraction { id }
  }
`);
