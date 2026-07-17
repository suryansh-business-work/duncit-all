import { gql } from '@apollo/client';
import type { MockedResponse } from '@apollo/client/testing';

/**
 * Mirror of the `ConsoleLogin` document the shared `PortalLoginPage` builds
 * (base user fields, no extras). Kept here so specs never inline the gql.
 */
export const LOGIN = gql`
  mutation ConsoleLogin($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        user_id
        first_name
        last_name
        email
        roles
      }
    }
  }
`;

/** An `AuthPayload` result — a token+user on success, or a null token to model a failed login. */
export const loginResultMock = (token: string | null, roles: string[]): MockedResponse => ({
  request: { query: LOGIN },
  variableMatcher: () => true,
  result: {
    data: {
      login: {
        __typename: 'AuthPayload',
        token,
        user: token
          ? {
              __typename: 'User',
              user_id: 'u1',
              first_name: 'A',
              last_name: 'B',
              email: 'a@b.com',
              roles,
            }
          : null,
      },
    },
  },
});
