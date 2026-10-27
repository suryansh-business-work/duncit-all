import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphQLError } from 'graphql';
import { LITE_ADMIN_SET_USER_FLAGS, LITE_ADMIN_USERS_TABLE } from '../../../graphql/users';
import { UsersPage } from '../../../pages/users';
import { makeMe } from '../../fixtures';
import { anyVariables, gqlUser, tablePage } from '../../gql-results';
import { findConfirm, findRow, findToast, renderWithProviders, type GqlMock } from '../../test-utils';

vi.mock('@duncit/table', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/table')>();
  const { FakeDuncitTable } = await import('../../fake-table');
  return { ...actual, DuncitTable: FakeDuncitTable };
});

vi.mock('../../../../shared/session', async () => {
  const fixtures = await import('../../fixtures');
  return { useLiteSession: () => fixtures.makeSession({ me: fixtures.makeMe({ id: 'me', name: 'Asha Rao', is_admin: true }) }) };
});

const me = makeMe({ id: 'me', name: 'Asha Rao', is_admin: true });
const ravi = makeMe({ id: 'user-2', name: 'Ravi', email: 'ravi@lite.example', handle: 'ravi' });

const usersTable: GqlMock = {
  request: { query: LITE_ADMIN_USERS_TABLE, variables: anyVariables },
  result: { data: { liteAdminUsersTable: tablePage('LiteAdminUsersPage', [me, ravi].map(gqlUser)) } },
  maxUsageCount: Number.POSITIVE_INFINITY,
};

const setFlag = (variables: Record<string, unknown>) => {
  const result = vi.fn(() => ({ data: { liteAdminSetUserFlags: gqlUser({ ...ravi, ...variables, id: 'user-2' }) } }));
  return { result, mock: { request: { query: LITE_ADMIN_SET_USER_FLAGS, variables }, result } satisfies GqlMock };
};

describe('UsersPage', () => {
  it('lists every account and locks the signed-in admin out of their own row', async () => {
    renderWithProviders(<UsersPage />, { mocks: [usersTable] });
    expect(screen.getByRole('heading', { level: 1, name: 'Users' })).toBeInTheDocument();
    const own = await findRow('me');
    for (const button of own.getAllByRole('button', { name: 'You cannot change your own account' })) expect(button).toBeDisabled();
    expect((await findRow('user-2')).getByRole('button', { name: 'Make Ravi an admin' })).toBeEnabled();
  });

  it('makes a member an admin after a plain confirmation', async () => {
    const user = userEvent.setup();
    const { result, mock } = setFlag({ id: 'user-2', is_admin: true });
    renderWithProviders(<UsersPage />, { mocks: [usersTable, mock] });
    await user.click((await findRow('user-2')).getByRole('button', { name: 'Make Ravi an admin' }));
    const confirm = within(await findConfirm());
    expect(confirm.getByText('Make Ravi an admin?')).toBeInTheDocument();
    expect(confirm.getByText('They can open this console and change anything in it.')).toBeInTheDocument();
    await user.click(confirm.getByRole('button', { name: 'Confirm' }));
    expect(await findToast('success')).toHaveTextContent('Ravi is now an admin');
    expect(result).toHaveBeenCalledTimes(1);
  });

  it('blocks an account after a destructive confirmation', async () => {
    const user = userEvent.setup();
    const { mock } = setFlag({ id: 'user-2', is_blocked: true });
    renderWithProviders(<UsersPage />, { mocks: [usersTable, mock] });
    await user.click((await findRow('user-2')).getByRole('button', { name: 'Block Ravi' }));
    const confirm = within(await findConfirm());
    expect(confirm.getByText('They can no longer sign in, host or register.')).toBeInTheDocument();
    expect(confirm.getByRole('button', { name: 'Confirm' })).toHaveClass('MuiButton-colorError');
    await user.click(confirm.getByRole('button', { name: 'Confirm' }));
    expect(await findToast('success')).toHaveTextContent('Ravi is blocked');
  });

  it('changes nothing when the confirmation is cancelled', async () => {
    const user = userEvent.setup();
    const { result, mock } = setFlag({ id: 'user-2', is_blocked: true });
    renderWithProviders(<UsersPage />, { mocks: [usersTable, mock] });
    await user.click((await findRow('user-2')).getByRole('button', { name: 'Block Ravi' }));
    await user.click(within(await findConfirm()).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument());
    expect(result).not.toHaveBeenCalled();
  });

  it("reports the API's refusal", async () => {
    const user = userEvent.setup();
    const refused: GqlMock = { request: { query: LITE_ADMIN_SET_USER_FLAGS, variables: { id: 'user-2', is_admin: true } }, result: { errors: [new GraphQLError('The last admin cannot be removed')] } };
    renderWithProviders(<UsersPage />, { mocks: [usersTable, refused] });
    await user.click((await findRow('user-2')).getByRole('button', { name: 'Make Ravi an admin' }));
    await user.click(within(await findConfirm()).getByRole('button', { name: 'Confirm' }));
    expect(await findToast('error')).toHaveTextContent('The last admin cannot be removed');
  });
});
