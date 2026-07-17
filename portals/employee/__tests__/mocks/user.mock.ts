import type { User } from '@duncit/gql-types';

/**
 * The employee portal never runs its own GraphQL queries — it delegates data
 * loading to the shared `@duncit/shell` chrome and `@duncit/user-context`. The
 * only mock DATA the specs need is the signed-in user object that the AppShell
 * adapter reads (roles + identity), so it is modelled here as a schema-synced
 * projection of the generated `User` type. A schema change to any of these
 * fields breaks this factory's typecheck rather than drifting silently.
 */
export type MockUser = Pick<
  User,
  '__typename' | 'user_id' | 'roles' | 'first_name' | 'full_name' | 'email'
>;

export const makeUser = (overrides: Partial<MockUser> = {}): MockUser => ({
  __typename: 'User',
  user_id: 'emp-1',
  roles: ['EMPLOYEE'],
  first_name: 'Asha',
  full_name: 'Asha Rao',
  email: 'asha@duncit.com',
  ...overrides,
});
