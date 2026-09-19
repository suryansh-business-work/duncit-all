import { gql, type TypedDocumentNode } from '@apollo/client';
import { LITE_USER_FIELDS, type LiteMe } from '../../shared/graphql/documents';

export interface LiteProfileInput {
  name: string;
  handle: string;
  bio: string;
  avatar_url: string;
  upi_id: string;
  upi_name: string;
}

export const LITE_UPDATE_PROFILE: TypedDocumentNode<{ liteUpdateProfile: LiteMe }, { input: LiteProfileInput }> = gql`
  mutation LiteUpdateProfile($input: LiteProfileInput!) {
    liteUpdateProfile(input: $input) {
      ...LiteUserFields
    }
  }
  ${LITE_USER_FIELDS}
`;
