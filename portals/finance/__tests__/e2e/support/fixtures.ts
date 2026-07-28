/**
 * Centralised GraphQL response builders so every spec works from the same
 * baseline. Use as `cy.mockGraphql({ ...baseMocks(), MyOp: customResponse })`.
 */

/** The signed-in finance manager — `roles` must satisfy `hasAppAccess`. */
export const financeUser = {
  __typename: 'User',
  user_id: 'u-fin-1',
  full_name: 'Fin Manager',
  first_name: 'Fin',
  last_name: 'Manager',
  email: 'fin@duncit.com',
  roles: ['FINANCE_MANAGER'],
  profile_photo: null,
};

/**
 * A signed-in user carrying NO finance role. `AppShell` computes `hasAccess`
 * from `hasAppAccess(user.roles)` and redirects to `/login?denied=1` when it is
 * false — this fixture is what drives that branch.
 */
export const noAccessUser = {
  ...financeUser,
  user_id: 'u-no-access',
  full_name: 'No Access',
  first_name: 'No',
  last_name: 'Access',
  roles: ['HOST'],
};

/**
 * Boot queries every authed page fires: `SessionMe` feeds the user-context that
 * the shell's role gate reads, `DashboardMe` feeds the `WelcomeDashboard`
 * greeting + role chips. Spread first, then override per spec.
 */
export const baseMocks = (user: Record<string, unknown> = financeUser) => ({
  SessionMe: { data: { me: user } },
  DashboardMe: { data: { me: user } },
});
