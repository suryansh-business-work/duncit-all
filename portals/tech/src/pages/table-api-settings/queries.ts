import { gql } from '@apollo/client';

/** Issues a new personal token; every URL built from the previous one stops working. */
export const ROTATE_MY_TABLE_API_TOKEN = gql`
  mutation RotateMyTableApiToken {
    rotateMyTableApiToken {
      token
      base_url
      created_at
      last_used_at
    }
  }
`;

export const REVOKE_MY_TABLE_API_TOKEN = gql`
  mutation RevokeMyTableApiToken {
    revokeMyTableApiToken {
      token
      base_url
      created_at
      last_used_at
    }
  }
`;
