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
