/**
 * The header's role info. The role → console map is the server's
 * (`required_roles`), so these tests pin that the UI reads it rather than
 * restating it, and that SUPER_ADMIN is the one role that opens everything.
 */
import { describe, expect, it } from 'vitest';
import { MockedProvider } from '@apollo/client/testing/react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { UserRolesDialog } from '../src/chrome/user-roles/UserRolesDialog';
import { portalsByRole, roleSummary } from '../src/chrome/user-roles/roles-for-portals';
import { MY_PORTAL_ACCESS, type PortalAccessEntry } from '../src/chrome/jump-to-portal/queries';

const entry = (over: Partial<PortalAccessEntry>): PortalAccessEntry => ({
  key: 'finance',
  name: 'Finance',
  url: 'https://finance.duncit.com/',
  has_access: true,
  can_request: true,
  required_roles: ['FINANCE_MANAGER', 'FINANCE_USER'],
  request_status: null,
  ...over,
});

const PORTALS = [
  entry({}),
  entry({ key: 'loyalty', name: 'Loyalty', url: 'https://loyalty.duncit.com/', required_roles: ['LOYALTY_MANAGER', 'FINANCE_MANAGER'] }),
  entry({ key: 'hr', name: 'HR', url: 'https://hr.duncit.com/', has_access: false, required_roles: ['HR_MANAGER'] }),
];

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

describe('roleSummary', () => {
  it('is empty without roles, the role alone with one, and "+N" with more', () => {
    expect(roleSummary(undefined)).toBe('');
    expect(roleSummary([])).toBe('');
    expect(roleSummary(['FINANCE_MANAGER'])).toBe('FINANCE MANAGER');
    expect(roleSummary(['FINANCE_MANAGER', 'HR_MANAGER', 'EMPLOYEE'])).toBe('FINANCE MANAGER +2');
  });
});

describe('portalsByRole', () => {
  it('lists only the portals the user can open whose required roles include the role', () => {
    const [finance, hr] = portalsByRole(['FINANCE_MANAGER', 'HR_MANAGER'], PORTALS);
    expect(finance?.portals.map((p) => p.key)).toEqual(['finance', 'loyalty']);
    expect(hr?.portals).toEqual([]);
  });

  it('gives SUPER_ADMIN every portal it can open, and none it cannot', () => {
    const [admin] = portalsByRole(['SUPER_ADMIN'], PORTALS);
    expect(admin?.portals.map((p) => p.key)).toEqual(['finance', 'loyalty']);
  });
});

describe('UserRolesDialog', () => {
  const renderDialog = (roles: string[]) =>
    render(
      <MockedProvider
        mocks={[
          {
            request: { query: MY_PORTAL_ACCESS },
            result: { data: { myPortalAccess: PORTALS.map((p) => ({ __typename: 'PortalAccessEntry', ...p })) } },
          },
        ]}
      >
        <UserRolesDialog open onClose={() => undefined} roles={roles} />
      </MockedProvider>,
    );

  it('shows each role with a link to every portal it opens', async () => {
    renderDialog(['FINANCE_MANAGER', 'HR_MANAGER']);
    await settle();
    const link = screen.getByTestId('user-roles-open-FINANCE_MANAGER-finance');
    expect(link).toHaveAttribute('href', 'https://finance.duncit.com/');
    expect(link).toHaveAttribute('target', '_blank');
    expect(screen.getByTestId('user-roles-open-FINANCE_MANAGER-loyalty')).toBeInTheDocument();
    expect(screen.getByTestId('user-roles-role-HR_MANAGER')).toHaveTextContent('No portal link for this role.');
  });

  it('opens Jump to Portal from the footer action', async () => {
    renderDialog(['FINANCE_MANAGER']);
    await settle();
    fireEvent.click(screen.getByTestId('user-roles-jump'));
    await settle();
    expect(screen.getByTestId('jump-to-portal-dialog')).toBeInTheDocument();
  });

  it('says so when the account has no roles', async () => {
    renderDialog([]);
    await settle();
    expect(screen.getByText('No roles are assigned to your account yet.')).toBeInTheDocument();
  });

  it('returns to the roles list when Jump to Portal is closed', async () => {
    renderDialog(['FINANCE_MANAGER']);
    await settle();
    fireEvent.click(screen.getByTestId('user-roles-jump'));
    await settle();
    const jump = screen.getByTestId('jump-to-portal-dialog');
    fireEvent.click(within(jump).getByLabelText('Close'));
    await waitFor(() => expect(screen.queryByTestId('jump-to-portal-dialog')).not.toBeInTheDocument());
    expect(screen.getByTestId('user-roles-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('user-roles-open-FINANCE_MANAGER-finance')).toBeInTheDocument();
  });

  it('says the portal list could not load, and offers no portal links, when the request fails', async () => {
    render(
      <MockedProvider mocks={[{ request: { query: MY_PORTAL_ACCESS }, error: new Error('offline') }]}>
        <UserRolesDialog open onClose={() => undefined} roles={['FINANCE_MANAGER']} />
      </MockedProvider>,
    );
    expect(await screen.findByTestId('user-roles-load-error')).toHaveTextContent('Could not load the portal list. Please try again.');
    expect(screen.getByTestId('user-roles-role-FINANCE_MANAGER')).toBeInTheDocument();
    expect(screen.queryByTestId('user-roles-open-FINANCE_MANAGER-finance')).not.toBeInTheDocument();
    expect(screen.queryByText('No portal link for this role.')).not.toBeInTheDocument();
  });
});
