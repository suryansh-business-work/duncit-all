import type { GqlFixtures } from './gql';

/** The signed-in finance manager — `roles` must satisfy `hasAppAccess`. */
export const ME = {
  me: {
    __typename: 'User',
    user_id: 'u-fin-1',
    full_name: 'Fin Manager',
    first_name: 'Fin',
    last_name: 'Manager',
    email: 'fin@duncit.com',
    roles: ['FINANCE_MANAGER'],
    profile_photo: null,
  },
};

/** A user without the finance role — drives the access-denied redirect. */
export const ME_NO_ACCESS = {
  me: { ...ME.me, user_id: 'u-x', roles: ['HOST'] },
};

/** Boot queries every authed page fires (session + shell). Spread first, then
 * override with page-specific fixtures. */
export const bootFixtures = (over: GqlFixtures = {}): GqlFixtures => ({
  SessionMe: ME,
  DashboardMe: ME,
  ...over,
});
