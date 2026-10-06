import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { Route } from 'react-router';
import { renderWithProviders } from '../../../__tests__/testkit';
import UsersPage from '../UsersPage';
import { CREATE_USER, ROLES, USERS_TABLE } from '../queries';

/**
 * Grid stub with a fetch that round-trips through the suite's MockedProvider.
 * It also remembers the rows it was handed so a click on a rendered row reaches
 * the page's `onRowClick` with that row, as the real grid does.
 */
vi.mock('@duncit/table', async (importOriginal) => {
  const stub = await import('../../location-subscriptions/__tests__/table-mock');
  const { useRef } = await import('react');
  type GridProps = Parameters<typeof stub.DuncitTable>[0] & {
    onRowClick: (row: unknown) => void;
  };
  function ClickableTable(props: Readonly<GridProps>) {
    const shown = useRef<unknown[]>([]);
    const fetchRows: GridProps['fetchRows'] = async (query) => {
      const res = await props.fetchRows(query);
      shown.current = res.rows;
      return res;
    };
    const onClick = (event: { target: EventTarget; currentTarget: HTMLElement }) => {
      const row = (event.target as HTMLElement).closest('[data-testid="table-row"]');
      const rows = Array.from(event.currentTarget.querySelectorAll('[data-testid="table-row"]'));
      if (row) props.onRowClick(shown.current[rows.indexOf(row)]);
    };
    return (
      <div onClick={onClick} role="presentation">
        <stub.DuncitTable {...props} fetchRows={fetchRows} />
      </div>
    );
  }
  return {
    ...(await importOriginal<typeof import('@duncit/table')>()),
    DuncitTable: ClickableTable,
    useApolloTableFetch: stub.useApolloTableFetch,
  };
});

/**
 * MUI X's sectioned date field cannot be typed into under jsdom (same approach
 * as DateField.test.tsx), so the picker is a stub that emits a picked day and
 * shows the helper text the form hands it.
 */
vi.mock('@mui/x-date-pickers/DatePicker', () => ({
  DatePicker: (props: {
    label: string;
    onChange: (d: Date | null) => void;
    slotProps: { textField: { helperText?: string } };
  }) => (
    <div>
      <span>{props.label}</span>
      <button type="button" onClick={() => props.onChange(new Date(1995, 5, 15))}>
        pick-dob
      </button>
      <span data-testid="dob-helper">{props.slotProps.textField.helperText}</span>
    </div>
  ),
}));

const JANE = {
  __typename: 'User',
  user_id: 'u-jane',
  first_name: 'Jane',
  last_name: 'Doe',
  full_name: 'Jane Doe',
  email: 'jane@example.com',
  phone_number: '9876543210',
  roles: ['USER'],
  profile_photo: null,
  is_email_verified: true,
  auth_providers: ['EMAIL'],
  google_email: null,
  last_login_provider: 'EMAIL',
  last_login_at: null,
  city: 'Pune',
  zone: null,
  status: 'ACTIVE',
  created_at: '2026-01-01T00:00:00.000Z',
};

const fetchCount = { value: 0 };
let tableRows: unknown[] = [];

const tableMock: MockedResponse = {
  request: { query: USERS_TABLE, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: () => {
    fetchCount.value += 1;
    return {
      data: {
        usersTable: { __typename: 'UsersTablePage', total: tableRows.length, rows: tableRows },
      },
    };
  },
};

const rolesMock: MockedResponse = {
  request: { query: ROLES },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      roles: [
        { __typename: 'Role', id: 'r-user', key: 'USER', name: 'User' },
        { __typename: 'Role', id: 'r-admin', key: 'ADMIN', name: 'Admin' },
      ],
    },
  },
};

const captureCreate = (sent: unknown[]): MockedResponse => ({
  request: { query: CREATE_USER, variables: () => true },
  result: (variables: Record<string, unknown>) => {
    sent.push(variables);
    return { data: { createUser: { __typename: 'User', user_id: 'u-new' } } };
  },
});

const renderPage = (mocks: MockedResponse[] = [], rows: unknown[] = []) => {
  fetchCount.value = 0;
  tableRows = rows;
  return renderWithProviders(<UsersPage />, {
    mocks: [rolesMock, tableMock, ...mocks],
    routes: (
      <>
        <Route path="/" element={<UsersPage />} />
        <Route path="/users/:id" element={<p>user details route</p>} />
      </>
    ),
  });
};

const openDialog = async () => {
  await screen.findByTestId(tableRows.length ? 'table-row' : 'table-empty');
  fireEvent.click(screen.getByRole('button', { name: 'Create User' }));
  return screen.findByRole('dialog');
};

const fillNamesAndPhone = (dialog: HTMLElement) => {
  fireEvent.change(within(dialog).getByLabelText(/First name/), { target: { value: 'Jane' } });
  fireEvent.change(within(dialog).getByLabelText(/Last name/), { target: { value: 'Doe' } });
  fireEvent.change(within(dialog).getByLabelText(/Phone number/), {
    target: { value: '9876543210' },
  });
};

const fillRequired = (dialog: HTMLElement) => {
  fillNamesAndPhone(dialog);
  fireEvent.click(within(dialog).getByText('pick-dob'));
};

describe('UsersPage — the table', () => {
  it('shows the users table with its empty state and the Create User action', async () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument();
    expect(await screen.findByTestId('table-empty')).toHaveTextContent(
      'No users match the current filters.'
    );
    expect(screen.getByTestId('duncit-table')).toHaveAttribute(
      'data-search-placeholder',
      'Search name, email or phone'
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it("opens a user's details when their row is clicked", async () => {
    renderPage([], [JANE]);
    const row = await screen.findByTestId('table-row');
    expect(within(row).getByTestId('value-first_name')).toHaveTextContent('Jane Doe');

    fireEvent.click(within(row).getByTestId('value-first_name'));
    expect(await screen.findByText('user details route')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Users' })).toBeNull();
  });
});

describe('UsersPage — creating a user', () => {
  it('opens the dialog with a generated 12-character password and the USER role', async () => {
    renderPage();
    const dialog = await openDialog();

    const password = within(dialog).getByLabelText(/Temporary password/) as HTMLInputElement;
    expect(password.value).toHaveLength(12);
    expect(password).toHaveAttribute('type', 'password');
    expect(within(dialog).getByRole('combobox', { name: /Roles/ })).toHaveTextContent(
      'User (USER)'
    );
    expect(within(dialog).queryByRole('alert')).toBeNull();
  });

  it('creates the user with the cast input, closes the dialog and refetches the table', async () => {
    const sent: unknown[] = [];
    renderPage([captureCreate(sent)]);
    const dialog = await openDialog();
    const fetchesBefore = fetchCount.value;
    const password = (within(dialog).getByLabelText(/Temporary password/) as HTMLInputElement)
      .value;

    fillRequired(dialog);
    fireEvent.change(within(dialog).getByLabelText(/Email/), {
      target: { value: 'jane@example.com' },
    });
    fireEvent.change(within(dialog).getByLabelText('City'), { target: { value: 'Pune' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create User' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(sent).toEqual([
      {
        input: {
          first_name: 'Jane',
          last_name: 'Doe',
          email: 'jane@example.com',
          phone_extension: '+91',
          phone_number: '9876543210',
          password,
          dob: new Date('1995-06-15').toISOString(),
          roles: ['USER'],
          city: 'Pune',
          zone: undefined,
        },
      },
    ]);
    await waitFor(() => expect(fetchCount.value).toBeGreaterThan(fetchesBefore));
  });

  it('locks the dialog while creating, then shows the server error and unlocks it', async () => {
    renderPage([
      {
        request: { query: CREATE_USER, variables: () => true },
        delay: 200,
        error: new Error('Phone number already registered'),
      },
    ]);
    const dialog = await openDialog();
    fillRequired(dialog);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create User' }));

    expect(await within(dialog).findByText('Creating…')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled();
    // A busy dialog ignores Escape: it has no onClose while the request is in flight.
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Phone number already registered'
    );
    expect(within(dialog).queryByText('Creating…')).toBeNull();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeEnabled();

    // Idle again, Escape closes it; reopening starts without the old error.
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const fresh = await openDialog();
    expect(within(fresh).queryByRole('alert')).toBeNull();
  });

  it('closes on Cancel without creating anything', async () => {
    renderPage();
    const dialog = await openDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('UsersPage — the create dialog fields', () => {
  it('refuses to submit without a role and shows the validation message on the roles field', async () => {
    const sent: unknown[] = [];
    renderPage([captureCreate(sent)]);
    const dialog = await openDialog();
    expect(within(dialog).getByText('At least one role is required.')).toBeInTheDocument();

    fillRequired(dialog);
    fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: /Roles/ }));
    const listbox = await screen.findByRole('listbox');
    fireEvent.click(within(listbox).getByRole('option', { name: 'User (USER)' }));
    fireEvent.keyDown(listbox, { key: 'Escape' });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create User' }));

    expect(await within(dialog).findByText('At least one role is required')).toHaveClass(
      'Mui-error'
    );
    expect(within(dialog).queryByText('At least one role is required.')).toBeNull();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(sent).toEqual([]);
  });

  it('flags a missing date of birth and a cleared phone code instead of submitting', async () => {
    const sent: unknown[] = [];
    renderPage([captureCreate(sent)]);
    const dialog = await openDialog();
    expect(within(dialog).getByTestId('dob-helper').textContent).toBe(' ');

    fillNamesAndPhone(dialog);
    // The clear indicator is CSS-hidden until hover, so it is found by its title.
    fireEvent.click(within(dialog).getByTitle('Clear'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create User' }));

    await waitFor(() =>
      expect(within(dialog).getByTestId('dob-helper')).toHaveTextContent(
        'Date of birth is required'
      )
    );
    expect(within(dialog).getByText(/phone code/i)).toHaveClass('Mui-error');
    expect(sent).toEqual([]);
  });

  it('generates a fresh password and toggles whether it is shown', async () => {
    renderPage();
    const dialog = await openDialog();
    const password = within(dialog).getByLabelText(/Temporary password/) as HTMLInputElement;
    const first = password.value;
    const toggle = within(dialog).getByTestId('create-user-toggle-password');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(toggle);
    expect(password).toHaveAttribute('type', 'text');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(within(dialog).getByTestId('create-user-generate-password'));
    await waitFor(() => expect(password.value).not.toBe(first));
    expect(password.value).toHaveLength(12);

    fireEvent.click(toggle);
    expect(password).toHaveAttribute('type', 'password');
  });

  it('turns a browser-autofilled single role into a one-role list', async () => {
    const sent: unknown[] = [];
    renderPage([captureCreate(sent)]);
    const dialog = await openDialog();
    fillRequired(dialog);

    // Autofill writes a plain string into Select's hidden native input.
    const nativeInput = dialog.querySelector('input.MuiSelect-nativeInput') as HTMLInputElement;
    fireEvent.change(nativeInput, { target: { value: 'ADMIN' } });
    expect(within(dialog).getByRole('combobox', { name: /Roles/ })).toHaveTextContent(
      'Admin (ADMIN)'
    );

    fireEvent.click(within(dialog).getByRole('button', { name: 'Create User' }));
    await waitFor(() => expect(sent).toHaveLength(1));
    expect(sent[0]).toMatchObject({ input: { roles: ['ADMIN'] } });
  });
});
