import { gql } from '@apollo/client';

/** Every column the audience table renders. Shared so the whole-audience view
 * and a saved list's members can never drift into two different row shapes. */
const AUDIENCE_MEMBER_FIELDS = gql`
  fragment AudienceMemberFields on AudienceMember {
    id
    full_name
    email
    phone
    age
    city
    state
    zone
    pincode
    country
    locale
    status
    roles
    email_verified
    phone_verified
    whatsapp_reachable
    push_platforms
    last_login_provider
    last_login_at
    created_at
  }
`;

export const AUDIENCE_TABLE = gql`
  query AudienceTable($query: TableQueryInput) {
    audienceTable(query: $query) {
      total
      rows {
        ...AudienceMemberFields
      }
    }
  }
  ${AUDIENCE_MEMBER_FIELDS}
`;

/** Who is in one saved list right now — its criteria plus its hand-picked
 * people, unioned by the server. */
export const AUDIENCE_LIST_MEMBERS_TABLE = gql`
  query AudienceListMembersTable($list_id: ID!, $query: TableQueryInput) {
    audienceListMembersTable(list_id: $list_id, query: $query) {
      total
      rows {
        ...AudienceMemberFields
      }
    }
  }
  ${AUDIENCE_MEMBER_FIELDS}
`;

/** The Add-user picker reads the same audience, but only the four fields it
 * shows — a picker has no use for push platforms or login history. */
export const AUDIENCE_PICKER_USERS = gql`
  query AudiencePickerUsers($query: TableQueryInput) {
    audienceTable(query: $query) {
      total
      rows {
        id
        full_name
        email
        phone
      }
    }
  }
`;

const AUDIENCE_LIST_FIELDS = gql`
  fragment AudienceListFields on AudienceList {
    id
    name
    description
    owner
    owner_user_id
    search
    manual_member_count
    member_count
    created_at
    filters {
      field
      op
      value
      values
    }
  }
`;

export const AUDIENCE_LISTS_TABLE = gql`
  query AudienceListsTable($query: TableQueryInput) {
    audienceListsTable(query: $query) {
      total
      rows {
        ...AudienceListFields
      }
    }
  }
  ${AUDIENCE_LIST_FIELDS}
`;

export const AUDIENCE_LIST = gql`
  query AudienceList($id: ID!) {
    audienceList(id: $id) {
      ...AudienceListFields
    }
  }
  ${AUDIENCE_LIST_FIELDS}
`;

export const AUDIENCE_LIST_OWNERS = gql`
  query AudienceListOwners {
    audienceListOwners {
      id
      name
      email
      is_admin
    }
  }
`;

export const CREATE_AUDIENCE_LIST = gql`
  mutation CreateAudienceList($input: AudienceListInput!) {
    createAudienceList(input: $input) {
      id
      name
    }
  }
`;

export const ADD_AUDIENCE_LIST_MEMBERS = gql`
  mutation AddAudienceListMembers($id: ID!, $user_ids: [ID!]!) {
    addAudienceListMembers(id: $id, user_ids: $user_ids) {
      id
      manual_member_count
      member_count
    }
  }
`;

export const DELETE_AUDIENCE_LIST = gql`
  mutation DeleteAudienceList($id: ID!) {
    deleteAudienceList(id: $id)
  }
`;

export const AUDIENCE_FILTER_OPTIONS = gql`
  query AudienceFilterOptions {
    audienceFilterOptions {
      interests {
        id
        name
      }
      roles
    }
  }
`;
