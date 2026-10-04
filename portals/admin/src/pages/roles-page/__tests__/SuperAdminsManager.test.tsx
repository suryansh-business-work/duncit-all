import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../../../__tests__/testkit';
import SuperAdminsManager from '../SuperAdminsManager';
import { ADMINS, GRANT_ADMIN, REVOKE_ADMIN, SEARCH_USERS } from '../queries';

const user = (user_id: string, full_name: string | null, email: string | null) => ({
  __typename: 'User',
  user_id,
  full_name,
  email,
});

const ROOT = user('u-root', 'Duncit Root', 'ADMIN@duncit.com');
const ASHA = user('u-asha', 'Asha Rao', 'asha@duncit.com');
const NO_NAME = user('u-mail', '', 'ops@duncit.com');
const RAVI = user('u-ravi', 'Ravi Kumar', null);
const ANON = user('u-anon', null, null);

const adminsMock = (users: unknown[], delay = 0): MockedResponse => ({
  request: { query: ADMINS },
  delay,
  result: { data: { users } },
});

const searchMock = (search: string, users: unknown[]): MockedResponse => ({
  request: { query: SEARCH_USERS, variables: { search } },
  result: { data: { users } },
});

const capture = (
  query: MockedResponse['request']['query'],
  field: string,
  sent: unknown[]
): MockedResponse => ({
  request: { query, variables: () => true },
  result: (variables: Record<string, unknown>) => {
    sent.push(variables);
    return {
      data: {
        [field]: { __typename: 'User', user_id: variables.user_id, roles: ['SUPER_ADMIN'] },
      },
    };
  },
});

const searchBox = () => screen.getByRole('combobox', { name: 'Search a user by name or email to make admin' });

/** The popup only opens on a focused input, as it does when a person types. */
const typeSearch = (value: string) => {
  fireEvent.focus(searchBox());
  fireEvent.change(searchBox(), { target: { value } });
};

describe('SuperAdminsManager — the admin list', () => {
  it('shows a spinner while the first load is pending, then says there are no admins', async () => {
    renderWithProviders(<SuperAdminsManager />, { mocks: [adminsMock([], 30)] });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByText('No admins yet.')).toBeNull();

    expect(await screen.findByText('No admins yet.')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('marks the root admin as locked and labels each admin by name, then email, then a fallback', async () => {
    renderWithProviders(<SuperAdminsManager />, { mocks: [adminsMock([ROOT, ASHA, NO_NAME, ANON])] });

    const root = (await screen.findByText('Duncit Root · root')).closest('.MuiChip-root') as HTMLElement;
    expect(root).toHaveClass('MuiChip-filled');
    expect(within(root).queryByTestId('CancelIcon')).toBeNull();
    expect(within(root).getByText('D')).toBeInTheDocument();

    const asha = screen.getByText('Asha Rao').closest('.MuiChip-root') as HTMLElement;
    expect(asha).toHaveClass('MuiChip-outlined');
    expect(asha).toHaveClass('MuiChip-colorPrimary');
    expect(within(asha).getByTestId('CancelIcon')).toBeInTheDocument();

    const byEmail = screen.getByText('ops@duncit.com').closest('.MuiChip-root') as HTMLElement;
    expect(within(byEmail).getByText('O')).toBeInTheDocument();

    const anon = screen.getByText('Unnamed user').closest('.MuiChip-root') as HTMLElement;
    expect(within(anon).getByText('U')).toBeInTheDocument();
    expect(within(anon).getByTestId('CancelIcon')).toBeInTheDocument();

    expect(screen.queryByText('No admins yet.')).toBeNull();
  });
});

describe('SuperAdminsManager — granting', () => {
  it('asks for two characters before searching', async () => {
    renderWithProviders(<SuperAdminsManager />, { mocks: [adminsMock([])] });
    await screen.findByText('No admins yet.');

    typeSearch('a');
    expect(await screen.findByText('Type at least 2 characters')).toBeInTheDocument();
  });

  it('offers only users who are not admins yet and says when nobody matches', async () => {
    renderWithProviders(<SuperAdminsManager />, {
      mocks: [adminsMock([ASHA]), searchMock('as', [ASHA]), searchMock('zz', [])],
    });
    await screen.findByText('Asha Rao');

    typeSearch('as');
    expect(await screen.findByText('No users found')).toBeInTheDocument();
    expect(screen.queryByRole('option')).toBeNull();

    typeSearch('zz');
    expect(await screen.findByText('No users found')).toBeInTheDocument();
  });

  it('grants admin to a picked user, confirms it and reloads the list', async () => {
    const sent: unknown[] = [];
    renderWithProviders(<SuperAdminsManager />, {
      mocks: [
        adminsMock([ASHA]),
        searchMock('ra', [ASHA, RAVI]),
        capture(GRANT_ADMIN, 'grantAdminAccess', sent),
        adminsMock([ASHA, RAVI]),
      ],
    });
    await screen.findByText('Asha Rao');

    typeSearch('ra');
    const option = await screen.findByRole('option', { name: 'Ravi Kumar · no email' });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    fireEvent.click(option);

    expect(
      await screen.findByText('Ravi Kumar is now an admin — a welcome email was sent.')
    ).toBeInTheDocument();
    expect(sent).toEqual([{ user_id: 'u-ravi' }]);
    expect(await screen.findByText('Ravi Kumar', { selector: '.MuiChip-label' })).toBeInTheDocument();
  });

  it('reports a grant the server refused', async () => {
    renderWithProviders(<SuperAdminsManager />, {
      mocks: [
        adminsMock([]),
        searchMock('ra', [RAVI]),
        {
          request: { query: GRANT_ADMIN, variables: { user_id: 'u-ravi' } },
          error: new Error('User is suspended'),
        },
      ],
    });
    await screen.findByText('No admins yet.');

    typeSearch('ra');
    fireEvent.click(await screen.findByRole('option', { name: 'Ravi Kumar · no email' }));

    expect(await screen.findByText('User is suspended')).toBeInTheDocument();
  });
});

describe('SuperAdminsManager — revoking', () => {
  const revokeChip = async () => {
    const chip = (await screen.findByText('Asha Rao')).closest('.MuiChip-root') as HTMLElement;
    fireEvent.click(within(chip).getByTestId('CancelIcon'));
    return screen.findByRole('dialog');
  };

  it('revokes access once confirmed and reloads the list', async () => {
    const sent: unknown[] = [];
    renderWithProviders(<SuperAdminsManager />, {
      mocks: [adminsMock([ROOT, ASHA]), capture(REVOKE_ADMIN, 'revokeAdminAccess', sent), adminsMock([ROOT])],
    });

    const dialog = await revokeChip();
    expect(within(dialog).getByText('Revoke admin access')).toBeInTheDocument();
    expect(
      within(dialog).getByText('Revoke admin access for Asha Rao? They will be emailed about this change.')
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Revoke' }));

    expect(
      await screen.findByText('Admin access revoked — a notification email was sent.')
    ).toBeInTheDocument();
    expect(sent).toEqual([{ user_id: 'u-asha' }]);
    await waitFor(() => expect(screen.queryByText('Asha Rao')).toBeNull());
    expect(screen.getByText('Duncit Root · root')).toBeInTheDocument();
  });

  it('leaves the admin in place when the confirmation is cancelled', async () => {
    const sent: unknown[] = [];
    renderWithProviders(<SuperAdminsManager />, {
      mocks: [adminsMock([ASHA]), capture(REVOKE_ADMIN, 'revokeAdminAccess', sent)],
    });

    const dialog = await revokeChip();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(sent).toEqual([]);
    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
  });

  it('reports a revoke the server refused', async () => {
    renderWithProviders(<SuperAdminsManager />, {
      mocks: [
        adminsMock([ASHA]),
        {
          request: { query: REVOKE_ADMIN, variables: { user_id: 'u-asha' } },
          error: new Error('Cannot revoke the last admin'),
        },
      ],
    });

    const dialog = await revokeChip();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Revoke' }));

    expect(await screen.findByText('Cannot revoke the last admin')).toBeInTheDocument();
  });
});
