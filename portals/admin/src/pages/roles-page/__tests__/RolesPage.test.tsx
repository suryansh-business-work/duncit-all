import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../../../__tests__/testkit';
import RolesPage from '../RolesPage';
import { ADMINS, CREATE_ROLE, DELETE_ROLE, ROLES_TABLE, UPDATE_ROLE } from '../queries';

/** Grid stub with a fetch that round-trips through the suite's MockedProvider. */
vi.mock('@duncit/table', async (importOriginal) => {
  const stub = await import('../../location-subscriptions/__tests__/table-mock');
  return {
    ...(await importOriginal<typeof import('@duncit/table')>()),
    DuncitTable: stub.DuncitTable,
    useApolloTableFetch: stub.useApolloTableFetch,
  };
});

const roleRow = (over: Record<string, unknown>) => ({
  __typename: 'Role',
  id: 'role-fin',
  key: 'FINANCE_MANAGER',
  name: 'Finance Manager',
  description: 'Runs the Finance console',
  is_system: true,
  created_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

const FINANCE = roleRow({});
const EDITOR = roleRow({
  id: 'role-ed',
  key: 'content-editor',
  name: 'Content Editor',
  description: null,
  is_system: false,
});

const fetchCount = { value: 0 };

const tableMock = (rows: unknown[]): MockedResponse => ({
  request: { query: ROLES_TABLE, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: () => {
    fetchCount.value += 1;
    return { data: { rolesTable: { __typename: 'RolesTablePage', total: rows.length, rows } } };
  },
});

const adminsMock: MockedResponse = {
  request: { query: ADMINS },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { users: [] } },
};

const capture = (
  query: MockedResponse['request']['query'],
  data: Record<string, unknown>,
  sent: unknown[]
): MockedResponse => ({
  request: { query, variables: () => true },
  result: (variables: Record<string, unknown>) => {
    sent.push(variables);
    return { data };
  },
});

const rowOf = (text: string) =>
  screen
    .getAllByTestId('table-row')
    .find((row) => within(row).queryAllByText(text).length > 0) as HTMLElement;

const rowsShown = async (count: number) => {
  await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(count));
};

const renderPage = (mocks: MockedResponse[]) => {
  fetchCount.value = 0;
  return renderWithProviders(<RolesPage />, { mocks: [adminsMock, ...mocks] });
};

describe('RolesPage — the table', () => {
  it('shows a system role with its portal link and a custom role without one', async () => {
    renderPage([tableMock([FINANCE, EDITOR])]);
    await rowsShown(2);

    expect(screen.getByRole('heading', { name: 'Roles' })).toBeInTheDocument();

    const finance = rowOf('FINANCE_MANAGER');
    const link = within(finance).getByRole('link', { name: /Finance/ });
    expect(link).toHaveAttribute('href', expect.stringContaining('finance'));
    expect(link).toHaveAttribute('target', '_blank');
    expect(within(finance).getByTestId('value-portal')).toHaveTextContent('Finance');
    expect(within(finance).getByTestId('value-description')).toHaveTextContent(
      'Runs the Finance console'
    );
    expect(within(finance).getByTestId('value-is_system')).toHaveTextContent('System');
    expect(within(finance).getByText('System', { selector: '.MuiChip-label' })).toBeInTheDocument();
    expect(within(finance).getByRole('button', { name: 'System (locked)' })).toBeDisabled();

    const editor = rowOf('content-editor');
    expect(within(editor).queryByRole('link')).toBeNull();
    expect(within(editor).getByTestId('value-portal')).toHaveTextContent('—');
    expect(within(editor).getByTestId('cell-portal')).toHaveTextContent('—');
    expect(within(editor).getByTestId('value-description')).toHaveTextContent('—');
    expect(within(editor).getByTestId('value-is_system')).toHaveTextContent('Custom');
    expect(within(editor).getByText('Custom', { selector: '.MuiChip-label' })).toBeInTheDocument();
    expect(within(editor).getByRole('button', { name: 'Delete' })).toBeEnabled();
  });

  it('asks the user to create the first role when there are none', async () => {
    renderPage([tableMock([])]);
    expect(await screen.findByTestId('table-empty')).toHaveTextContent(
      'No roles yet. Click "New Role" to create the first one.'
    );
  });
});

describe('RolesPage — creating and editing', () => {
  it('keeps Save disabled until key and name are filled, then creates the role', async () => {
    const sent: unknown[] = [];
    renderPage([
      tableMock([]),
      capture(CREATE_ROLE, { createRole: { __typename: 'Role', id: 'role-new' } }, sent),
    ]);
    await screen.findByTestId('table-empty');
    const fetchesBefore = fetchCount.value;

    fireEvent.click(screen.getByRole('button', { name: 'New Role' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('New Role')).toBeInTheDocument();
    const save = within(dialog).getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText(/Key/), { target: { value: 'CITY_ADMIN' } });
    expect(save).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText(/Name/), { target: { value: 'City Admin' } });
    fireEvent.change(within(dialog).getByLabelText('Description'), {
      target: { value: 'Runs one city' },
    });
    expect(save).toBeEnabled();
    fireEvent.click(save);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(sent).toEqual([
      { input: { key: 'CITY_ADMIN', name: 'City Admin', description: 'Runs one city' } },
    ]);
    await waitFor(() => expect(fetchCount.value).toBeGreaterThan(fetchesBefore));
  });

  it('opens a role prefilled with a locked key and saves only name and description', async () => {
    const sent: unknown[] = [];
    renderPage([
      tableMock([EDITOR]),
      capture(UPDATE_ROLE, { updateRole: { __typename: 'Role', id: 'role-ed' } }, sent),
    ]);
    await rowsShown(1);

    fireEvent.click(within(rowOf('content-editor')).getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Edit Role')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Key/)).toHaveValue('content-editor');
    expect(within(dialog).getByLabelText(/Key/)).toBeDisabled();
    expect(within(dialog).getByLabelText('Description')).toHaveValue('');

    fireEvent.change(within(dialog).getByLabelText(/Name/), { target: { value: 'Senior Editor' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(sent).toEqual([
      { role_id: 'role-ed', input: { name: 'Senior Editor', description: '' } },
    ]);
  });

  it('shows Saving while the request is in flight and keeps the dialog open with the error', async () => {
    renderPage([
      tableMock([EDITOR]),
      {
        request: { query: UPDATE_ROLE, variables: () => true },
        delay: 200,
        error: new Error('Role name already taken'),
      },
    ]);
    await rowsShown(1);

    fireEvent.click(within(rowOf('content-editor')).getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Role name already taken');
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeEnabled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'New Role' }));
    const fresh = await screen.findByRole('dialog');
    expect(within(fresh).queryByRole('alert')).toBeNull();
    expect(within(fresh).getByLabelText(/Key/)).toHaveValue('');
  });
});

describe('RolesPage — deleting', () => {
  it('deletes a custom role once confirmed and reloads the table', async () => {
    const sent: unknown[] = [];
    renderPage([tableMock([EDITOR]), capture(DELETE_ROLE, { deleteRole: true }, sent)]);
    await rowsShown(1);
    const fetchesBefore = fetchCount.value;

    fireEvent.click(within(rowOf('content-editor')).getByRole('button', { name: 'Delete' }));
    const confirm = await screen.findByRole('dialog');
    expect(within(confirm).getByText('Delete role "content-editor"?')).toBeInTheDocument();
    fireEvent.click(within(confirm).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(sent).toEqual([{ role_id: 'role-ed' }]));
    await waitFor(() => expect(fetchCount.value).toBeGreaterThan(fetchesBefore));
  });

  it('keeps the role when the confirmation is cancelled', async () => {
    const sent: unknown[] = [];
    renderPage([tableMock([EDITOR]), capture(DELETE_ROLE, { deleteRole: true }, sent)]);
    await rowsShown(1);

    fireEvent.click(within(rowOf('content-editor')).getByRole('button', { name: 'Delete' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(sent).toEqual([]);
  });

  it('reports a delete the server refused', async () => {
    renderPage([
      tableMock([EDITOR]),
      {
        request: { query: DELETE_ROLE, variables: { role_id: 'role-ed' } },
        error: new Error('Role is still assigned to users'),
      },
    ]);
    await rowsShown(1);

    fireEvent.click(within(rowOf('content-editor')).getByRole('button', { name: 'Delete' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Role is still assigned to users')).toBeInTheDocument();
  });
});
