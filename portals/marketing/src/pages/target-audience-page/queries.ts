import { gql } from '@apollo/client';

export const AUDIENCE_TABLE = gql`
  query AudienceTable($query: TableQueryInput) {
    audienceTable(query: $query) {
      total
      rows {
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
