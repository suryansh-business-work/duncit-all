import { gql } from '@apollo/client';
import type { MockedResponse } from '@apollo/client/testing';
import type { AuthPayload, User } from '@duncit/gql-types';

/**
 * The `login` mutation the shared `PortalLoginPage` builds selects a small
 * projection of the auth payload. These `Pick`s stay synced to the generated
 * `AuthPayload`/`User` types and carry the `__typename` the Apollo cache needs.
 */
export type AuthUserFields = Pick<User, 'user_id' | 'first_name' | 'last_name' | 'email' | 'roles'> & {
  __typename: 'User';
};

export type LoginPayloadFields = Pick<AuthPayload, 'token'> & {
  __typename: 'AuthPayload';
  user: AuthUserFields;
};

/** The exact `ConsoleLogin` document `PortalLoginPage` builds for a portal. */
export const CONSOLE_LOGIN = gql`
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

export const makeAuthUser = (over: Partial<AuthUserFields> = {}): AuthUserFields => ({
  __typename: 'User',
  user_id: 'u1',
  first_name: 'Asha',
  last_name: 'Rao',
  email: 'asha@duncit.com',
  roles: ['HR_MANAGER'],
  ...over,
});

export const makeLoginPayload = (over: Partial<LoginPayloadFields> = {}): LoginPayloadFields => ({
  __typename: 'AuthPayload',
  token: 'session-token',
  user: makeAuthUser(),
  ...over,
});

/**
 * `MockedResponse` for a login attempt. An empty `token` drives the
 * "login failed" branch; a non-empty token with a given role set drives the
 * success / access-gate branches. `variableMatcher` accepts any input so the
 * spec doesn't have to restate the `portal_key`-augmented variables.
 */
export const loginMock = (over: { token?: string; roles?: string[] } = {}): MockedResponse => {
  const { token = 'session-token', roles = ['HR_MANAGER'] } = over;
  return {
    request: { query: CONSOLE_LOGIN },
    variableMatcher: () => true,
    result: { data: { login: makeLoginPayload({ token, user: makeAuthUser({ roles }) }) } },
  };
};
