import { gql } from '@apollo/client';
import type { MockedResponse } from '@apollo/client/testing';
import type { User } from '@duncit/gql-types';

/**
 * Login mocks for the shared `PortalLoginPage` (mutationName `ConsoleLogin`,
 * no extra user fields). The document mirrors the shell's generated
 * `buildLoginMutation` exactly so the default `addTypename` `MockedProvider`
 * matches it, and the payload carries `__typename` on `AuthPayload`/`User`.
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

export type LoginUserMock = Pick<
  User,
  'user_id' | 'first_name' | 'last_name' | 'email' | 'roles'
> & { __typename?: 'User' };

export const makeLoginUser = (over: Partial<LoginUserMock> = {}): LoginUserMock => ({
  __typename: 'User',
  user_id: 'u1',
  first_name: 'A',
  last_name: 'B',
  email: 'a@b.com',
  roles: [],
  ...over,
});

/** A successful/failed login. `token: null` models the "no token" server reply. */
export const loginMock = (token: string | null, roles: string[]): MockedResponse => ({
  request: { query: LOGIN },
  variableMatcher: () => true,
  result: {
    data: {
      login: token
        ? { __typename: 'AuthPayload', token, user: makeLoginUser({ roles }) }
        : { __typename: 'AuthPayload', token: null, user: null },
    },
  },
});

/** A GraphQL-level login failure (bad credentials). */
export const loginErrorMock = (message: string): MockedResponse => ({
  request: { query: LOGIN },
  variableMatcher: () => true,
  result: { errors: [{ message }] as never },
});
