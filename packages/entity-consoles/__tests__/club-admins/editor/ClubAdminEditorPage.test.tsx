import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, useLocation } from 'react-router';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { renderWithProviders } from '../../testkit';
import { ACCOUNT_CANDIDATES } from '../../../src/shared/AccountPicker';
import {
  ADMIN_CREATE_CLUB_ADMIN,
  APPROVE_CLUB_ADMIN,
  ASSIGN_CLUB_ADMIN_CLUBS,
  CLUB_ADMIN_DETAIL,
  CLUB_ADMIN_MATCHING_CLUBS,
  REJECT_CLUB_ADMIN,
  SET_CLUB_ADMIN_ACTIVE,
  SET_CLUB_ADMIN_COMMISSION,
  UPDATE_CLUB_ADMIN,
} from '../../../src/club-admins/queries';
import ClubAdminEditorPage from '../../../src/club-admins/editor';

const session = vi.hoisted(() => ({ roles: ['SUPER_ADMIN'] as string[] }));
const calls = vi.hoisted(() => ({ log: [] as { op: string; variables: unknown }[] }));

vi.mock('@duncit/user-context', () => ({
  useUserData: () => ({ user: { roles: session.roles } }),
}));

// The taxonomy picker loads the category tree over GraphQL and has its own
// suite; the editor only needs to carry its value through the save.
vi.mock('@duncit/category', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, RhfAdminCategory: () => <div data-testid="category-field" /> };
});

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="path">{location.pathname}</span>;
}

const ADMIN = {
  __typename: 'ClubAdminProfile',
  id: 'ca1',
  club_admin_no: 'CA-1',
  user_id: 'u1',
  full_name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '9876543210',
  super_category: 'Sports',
  category: 'Racquet',
  sub_category: 'Tennis',
  super_category_id: 'sc1',
  category_id: 'cat1',
  sub_category_id: 'sub1',
  status: 'DRAFT',
  is_active: true,
  commission_pct: 10,
  joined_at: null,
  reviewer_notes: null,
  request_no: null,
  created_at: '2026-01-01T00:00:00.000Z',
  assigned_clubs: [{ __typename: 'AssignedClub', id: 'c1', club_name: 'Alpha Club' }],
};

const detailMock = (over: Record<string, unknown> = {}): MockedResponse => ({
  request: { query: CLUB_ADMIN_DETAIL, variables: { id: 'ca1' } },
  result: { data: { clubAdminProfile: { ...ADMIN, ...over } } },
});

const clubsMock = (): MockedResponse => ({
  request: { query: CLUB_ADMIN_MATCHING_CLUBS, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      clubAdminMatchingClubs: [
        { __typename: 'ClubOption', id: 'c1', club_name: 'Alpha Club', assigned: true, matches_category: true },
        { __typename: 'ClubOption', id: 'c2', club_name: 'Beta Club', assigned: false, matches_category: false },
      ],
    },
  },
});

/** A mutation mock that records its variables, so the ORDER of the writes is assertable. */
const writeMock = (
  op: string,
  query: MockedResponse['request']['query'],
  data: Record<string, unknown>,
  error?: Error,
): MockedResponse => ({
  request: {
    query,
    variables: (variables: unknown) => {
      calls.log.push({ op, variables });
      return true;
    },
  },
  ...(error ? { error } : { result: { data } }),
});

const writes = () => calls.log.map((c) => c.op);

const renderEditor = (entry: string, mocks: MockedResponse[]) =>
  renderWithProviders(<></>, {
    mocks,
    initialEntries: [entry],
    routes: (
      <>
        <Route
          path="/club-admins/new"
          element={
            <>
              <ClubAdminEditorPage />
              <LocationProbe />
            </>
          }
        />
        <Route
          path="/club-admins/:clubAdminId/edit"
          element={
            <>
              <ClubAdminEditorPage />
              <LocationProbe />
            </>
          }
        />
        <Route path="/club-admins/:clubAdminId" element={<LocationProbe />} />
      </>
    ),
  });

const accountMock = (): MockedResponse => ({
  request: { query: ACCOUNT_CANDIDATES, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: {
      usersTable: {
        __typename: 'UsersTablePage',
        total: 1,
        rows: [
          {
            __typename: 'UserRow',
            user_id: 'u9',
            full_name: 'Priya Nair',
            email: 'priya@example.com',
            phone_number: '9123456780',
          },
        ],
      },
    },
  },
});

const saveButtons = () => screen.getAllByRole('button', { name: 'Save club admin' });

beforeEach(() => {
  calls.log.length = 0;
  session.roles = ['SUPER_ADMIN'];
});

describe('ClubAdminEditorPage / loading an existing admin', () => {
  it('hydrates the form, locks the account and shows the clubs they run', async () => {
    renderEditor('/club-admins/ca1/edit', [detailMock(), clubsMock()]);

    expect(await screen.findByRole('heading', { name: 'Jane Doe' })).toBeInTheDocument();
    expect(screen.getByText('Club Admins · Edit')).toBeInTheDocument();
    expect(screen.getByText(/The account cannot be changed here/)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Full name/i })).toHaveValue('Jane Doe');
    expect(screen.getByRole('textbox', { name: /^Email/i })).toHaveValue('jane@example.com');
    expect(screen.getByRole('spinbutton', { name: /Commission/i })).toHaveValue(10);
    expect(await screen.findByText('Alpha Club')).toBeInTheDocument();
  });

  it('falls back to the generic title for an admin with no name', async () => {
    renderEditor('/club-admins/ca1/edit', [detailMock({ full_name: '' }), clubsMock()]);
    expect(await screen.findByRole('heading', { name: 'Edit club admin' })).toBeInTheDocument();
  });

  it('says so when the record does not exist', async () => {
    renderEditor('/club-admins/ca1/edit', [
      {
        request: { query: CLUB_ADMIN_DETAIL, variables: { id: 'ca1' } },
        result: { data: { clubAdminProfile: null } },
      },
    ]);
    expect(await screen.findByText('Club admin not found.')).toBeInTheDocument();
  });

  it('shows the server error when the record cannot be loaded', async () => {
    renderEditor('/club-admins/ca1/edit', [
      {
        request: { query: CLUB_ADMIN_DETAIL, variables: { id: 'ca1' } },
        result: { errors: [new GraphQLError('Not allowed')] },
      },
    ]);
    expect(await screen.findByText('Not allowed')).toBeInTheDocument();
  });
});

describe('ClubAdminEditorPage / saving as a governor', () => {
  it('writes details, clubs, commission, the approval and the live switch in that order', async () => {
    renderEditor('/club-admins/ca1/edit', [
      detailMock(),
      clubsMock(),
      writeMock('update', UPDATE_CLUB_ADMIN, { updateClubAdminProfile: { __typename: 'ClubAdminProfile', id: 'ca1' } }),
      writeMock('assign', ASSIGN_CLUB_ADMIN_CLUBS, { assignClubAdminClubs: { __typename: 'ClubAdminProfile', id: 'ca1' } }),
      writeMock('commission', SET_CLUB_ADMIN_COMMISSION, { setClubAdminCommission: { __typename: 'ClubAdminProfile', id: 'ca1' } }),
      writeMock('approve', APPROVE_CLUB_ADMIN, { approveClubAdminProfile: { __typename: 'ClubAdminProfile', id: 'ca1', status: 'APPROVED' } }),
      writeMock('active', SET_CLUB_ADMIN_ACTIVE, { setClubAdminProfileActive: { __typename: 'ClubAdminProfile', id: 'ca1', is_active: false } }),
    ]);
    await screen.findByRole('heading', { name: 'Jane Doe' });

    fireEvent.change(screen.getByRole('spinbutton', { name: /Commission/i }), { target: { value: '12' } });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Status' }));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('Approved'));
    fireEvent.click(screen.getByRole('switch'));
    expect(screen.getByText(/Saving with this off suspends the club admin/)).toBeInTheDocument();

    fireEvent.click(saveButtons()[0]);

    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/club-admins/ca1'));
    expect(writes()).toEqual(['update', 'assign', 'commission', 'approve', 'active']);

    const byOp = Object.fromEntries(calls.log.map((c) => [c.op, c.variables]));
    expect(byOp.update).toMatchObject({
      id: 'ca1',
      input: {
        full_name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '9876543210',
        super_category_id: 'sc1',
        category_id: 'cat1',
        sub_category_id: 'sub1',
        commission_pct: 12,
      },
    });
    expect(byOp.assign).toEqual({ id: 'ca1', club_ids: ['c1'] });
    expect(byOp.commission).toEqual({ id: 'ca1', commission_pct: 12 });
    expect(byOp.approve).toEqual({ id: 'ca1', notes: null });
    expect(byOp.active).toEqual({ id: 'ca1', is_active: false });
  });

  it('rejects with the console note when the decision moves to Rejected', async () => {
    renderEditor('/club-admins/ca1/edit', [
      detailMock({ commission_pct: null }),
      clubsMock(),
      writeMock('update', UPDATE_CLUB_ADMIN, { updateClubAdminProfile: { __typename: 'ClubAdminProfile', id: 'ca1' } }),
      writeMock('assign', ASSIGN_CLUB_ADMIN_CLUBS, { assignClubAdminClubs: { __typename: 'ClubAdminProfile', id: 'ca1' } }),
      writeMock('commission', SET_CLUB_ADMIN_COMMISSION, { setClubAdminCommission: { __typename: 'ClubAdminProfile', id: 'ca1' } }),
      writeMock('reject', REJECT_CLUB_ADMIN, { rejectClubAdminProfile: { __typename: 'ClubAdminProfile', id: 'ca1', status: 'REJECTED' } }),
    ]);
    await screen.findByRole('heading', { name: 'Jane Doe' });

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Status' }));
    fireEvent.click(within(screen.getByRole('listbox')).getByText('Rejected'));
    fireEvent.click(saveButtons()[1]);

    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/club-admins/ca1'));
    const reject = calls.log.find((c) => c.op === 'reject');
    expect(reject?.variables).toEqual({ id: 'ca1', notes: 'Rejected from the Club Admins console.' });
    // A cleared commission is sent as null, which inherits the platform default.
    expect(calls.log.find((c) => c.op === 'commission')?.variables).toEqual({
      id: 'ca1',
      commission_pct: null,
    });
    expect(writes()).not.toContain('active');
  });

  it('sends no review decision and no live switch when neither moved', async () => {
    renderEditor('/club-admins/ca1/edit', [
      detailMock({ status: 'APPROVED' }),
      clubsMock(),
      writeMock('update', UPDATE_CLUB_ADMIN, { updateClubAdminProfile: { __typename: 'ClubAdminProfile', id: 'ca1' } }),
      writeMock('assign', ASSIGN_CLUB_ADMIN_CLUBS, { assignClubAdminClubs: { __typename: 'ClubAdminProfile', id: 'ca1' } }),
      writeMock('commission', SET_CLUB_ADMIN_COMMISSION, { setClubAdminCommission: { __typename: 'ClubAdminProfile', id: 'ca1' } }),
    ]);
    await screen.findByRole('heading', { name: 'Jane Doe' });

    fireEvent.click(saveButtons()[0]);

    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/club-admins/ca1'));
    expect(writes()).toEqual(['update', 'assign', 'commission']);
  });

  it('keeps Draft as a decision that sends nothing when only the details changed', async () => {
    renderEditor('/club-admins/ca1/edit', [
      detailMock(),
      clubsMock(),
      writeMock('update', UPDATE_CLUB_ADMIN, { updateClubAdminProfile: { __typename: 'ClubAdminProfile', id: 'ca1' } }),
      writeMock('assign', ASSIGN_CLUB_ADMIN_CLUBS, { assignClubAdminClubs: { __typename: 'ClubAdminProfile', id: 'ca1' } }),
      writeMock('commission', SET_CLUB_ADMIN_COMMISSION, { setClubAdminCommission: { __typename: 'ClubAdminProfile', id: 'ca1' } }),
    ]);
    await screen.findByRole('heading', { name: 'Jane Doe' });
    fireEvent.change(screen.getByRole('textbox', { name: /Full name/i }), { target: { value: 'Jane Roe' } });
    fireEvent.click(saveButtons()[0]);

    await waitFor(() => expect(writes()).toContain('commission'));
    expect(calls.log[0].variables).toMatchObject({ id: 'ca1', input: { full_name: 'Jane Roe' } });
    expect(writes()).not.toContain('approve');
    expect(writes()).not.toContain('reject');
  });
});

describe('ClubAdminEditorPage / saving without governor rights', () => {
  it('disables status, commission and the switch, and writes only details and clubs', async () => {
    session.roles = ['ALL_CLUBS_ACCESS'];
    renderEditor('/club-admins/ca1/edit', [
      detailMock(),
      clubsMock(),
      writeMock('update', UPDATE_CLUB_ADMIN, { updateClubAdminProfile: { __typename: 'ClubAdminProfile', id: 'ca1' } }),
      writeMock('assign', ASSIGN_CLUB_ADMIN_CLUBS, { assignClubAdminClubs: { __typename: 'ClubAdminProfile', id: 'ca1' } }),
    ]);
    await screen.findByRole('heading', { name: 'Jane Doe' });

    expect(screen.getByRole('spinbutton', { name: /Commission/i })).toBeDisabled();
    expect(screen.getByRole('switch')).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(saveButtons()[0]);

    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/club-admins/ca1'));
    expect(writes()).toEqual(['update', 'assign']);
    // The commission field is not even in the details input for this viewer.
    expect((calls.log[0].variables as { input: Record<string, unknown> }).input).not.toHaveProperty(
      'commission_pct',
    );
  });
});

describe('ClubAdminEditorPage / failures', () => {
  it('stays on the page with the server message when a write fails', async () => {
    renderEditor('/club-admins/ca1/edit', [
      detailMock(),
      clubsMock(),
      writeMock(
        'update',
        UPDATE_CLUB_ADMIN,
        {},
        new Error('Email already used by another club admin'),
      ),
    ]);
    await screen.findByRole('heading', { name: 'Jane Doe' });

    fireEvent.click(saveButtons()[0]);

    expect(await screen.findByText('Email already used by another club admin')).toBeInTheDocument();
    expect(screen.getByTestId('path').textContent).toBe('/club-admins/ca1/edit');
    expect(writes()).toEqual(['update']);
  });

  it('validates before sending anything: a malformed email is flagged and nothing is written', async () => {
    renderEditor('/club-admins/ca1/edit', [detailMock(), clubsMock()]);
    await screen.findByRole('heading', { name: 'Jane Doe' });

    fireEvent.change(screen.getByRole('textbox', { name: /^Email/i }), { target: { value: 'not-an-email' } });
    fireEvent.click(saveButtons()[0]);

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(writes()).toEqual([]);
  });
});

describe('ClubAdminEditorPage / appointing a new club admin', () => {
  it('leaves the phone blank when the picked account has none on file', async () => {
    renderEditor('/club-admins/new', [
      {
        request: { query: ACCOUNT_CANDIDATES, variables: () => true },
        maxUsageCount: Number.POSITIVE_INFINITY,
        result: {
          data: {
            usersTable: {
              __typename: 'UsersTablePage',
              total: 1,
              rows: [
                {
                  __typename: 'UserRow',
                  user_id: 'u8',
                  full_name: 'No Phone',
                  email: 'nophone@example.com',
                  phone_number: null,
                },
              ],
            },
          },
        },
      },
    ]);

    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /Account/i }));
    fireEvent.click(await screen.findByText('No Phone · nophone@example.com'));

    await waitFor(() => expect(screen.getByRole('textbox', { name: /Full name/i })).toHaveValue('No Phone'));
    expect(screen.getByRole('textbox', { name: /^Phone/i })).toHaveValue('');
  });

  it('leaves the details blank when the picked account has none on file', async () => {
    renderEditor('/club-admins/new', [
      {
        request: { query: ACCOUNT_CANDIDATES, variables: () => true },
        maxUsageCount: Number.POSITIVE_INFINITY,
        result: {
          data: {
            usersTable: {
              __typename: 'UsersTablePage',
              total: 1,
              rows: [
                {
                  __typename: 'UserRow',
                  user_id: 'u7',
                  full_name: null,
                  email: null,
                  phone_number: '9000000001',
                },
              ],
            },
          },
        },
      },
    ]);

    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /Account/i }));
    fireEvent.click(await screen.findByText('9000000001'));

    await waitFor(() => expect(screen.getByRole('textbox', { name: /^Phone/i })).toHaveValue('9000000001'));
    expect(screen.getByRole('textbox', { name: /Full name/i })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: /^Email/i })).toHaveValue('');
  });

  it('asks for an account first and defers club assignment until the record exists', async () => {
    renderEditor('/club-admins/new', [accountMock()]);

    expect(await screen.findByText('Club Admins · Appoint')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Appoint a club admin' })).toBeInTheDocument();
    expect(screen.getByText(/Clubs can be assigned once the record exists/)).toBeInTheDocument();

    fireEvent.click(saveButtons()[0]);

    expect(await screen.findByText('Pick the Duncit account to appoint')).toBeInTheDocument();
    expect(writes()).toEqual([]);
  });

  it('copies the picked account into the form, creates the record and opens it', async () => {
    renderEditor('/club-admins/new', [
      accountMock(),
      writeMock('create', ADMIN_CREATE_CLUB_ADMIN, {
        adminCreateClubAdminProfile: { __typename: 'ClubAdminProfile', id: 'ca9', status: 'DRAFT' },
      }),
      writeMock('assign', ASSIGN_CLUB_ADMIN_CLUBS, { assignClubAdminClubs: { __typename: 'ClubAdminProfile', id: 'ca9' } }),
      writeMock('commission', SET_CLUB_ADMIN_COMMISSION, { setClubAdminCommission: { __typename: 'ClubAdminProfile', id: 'ca9' } }),
    ]);

    const account = await screen.findByRole('combobox', { name: /Account/i });
    fireEvent.mouseDown(account);
    fireEvent.click(await screen.findByText('Priya Nair · priya@example.com'));

    await waitFor(() => expect(screen.getByRole('textbox', { name: /Full name/i })).toHaveValue('Priya Nair'));
    expect(screen.getByRole('textbox', { name: /^Email/i })).toHaveValue('priya@example.com');
    expect(screen.getByRole('textbox', { name: /^Phone/i })).toHaveValue('9123456780');

    fireEvent.click(saveButtons()[0]);

    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/club-admins/ca9'));
    expect(calls.log[0]).toMatchObject({
      op: 'create',
      variables: { user_id: 'u9', input: { full_name: 'Priya Nair', email: 'priya@example.com' } },
    });
    expect(writes()).toEqual(['create', 'assign', 'commission']);
    expect(calls.log[1].variables).toEqual({ id: 'ca9', club_ids: [] });
  });

  it('refuses to carry on when the create call returns no id', async () => {
    renderEditor('/club-admins/new', [
      accountMock(),
      writeMock('create', ADMIN_CREATE_CLUB_ADMIN, { adminCreateClubAdminProfile: null }),
    ]);

    fireEvent.mouseDown(await screen.findByRole('combobox', { name: /Account/i }));
    fireEvent.click(await screen.findByText('Priya Nair · priya@example.com'));
    await waitFor(() => expect(screen.getByRole('textbox', { name: /Full name/i })).toHaveValue('Priya Nair'));

    fireEvent.click(saveButtons()[0]);

    expect(
      await screen.findByText('The club admin was not saved — no id came back.'),
    ).toBeInTheDocument();
    expect(writes()).toEqual(['create']);
  });
});

describe('ClubAdminEditorPage / assigning clubs', () => {
  it('searches the matching clubs on the server as the admin types', async () => {
    const searches: unknown[] = [];
    renderEditor('/club-admins/ca1/edit', [
      detailMock(),
      {
        request: {
          query: CLUB_ADMIN_MATCHING_CLUBS,
          variables: (variables: { id: string; search: string }) => {
            searches.push(variables.search);
            return true;
          },
        },
        maxUsageCount: Number.POSITIVE_INFINITY,
        result: { data: { clubAdminMatchingClubs: [] } },
      },
    ]);
    await screen.findByRole('heading', { name: 'Jane Doe' });

    fireEvent.change(await screen.findByRole('combobox', { name: 'Clubs they run' }), {
      target: { value: 'Bet' },
    });

    await waitFor(() => expect(searches).toContain('Bet'));
  });

  it('lets the admin add a club from outside their category and sends the whole set', async () => {
    renderEditor('/club-admins/ca1/edit', [
      detailMock(),
      clubsMock(),
      writeMock('update', UPDATE_CLUB_ADMIN, { updateClubAdminProfile: { __typename: 'ClubAdminProfile', id: 'ca1' } }),
      writeMock('assign', ASSIGN_CLUB_ADMIN_CLUBS, { assignClubAdminClubs: { __typename: 'ClubAdminProfile', id: 'ca1' } }),
      writeMock('commission', SET_CLUB_ADMIN_COMMISSION, { setClubAdminCommission: { __typename: 'ClubAdminProfile', id: 'ca1' } }),
    ]);
    await screen.findByRole('heading', { name: 'Jane Doe' });

    const field = await screen.findByRole('combobox', { name: 'Clubs they run' });
    fireEvent.mouseDown(field);
    const betaOption = await screen.findByRole('option', { name: /Beta Club/ });
    expect(within(betaOption).getByText('Outside their category — assigned anyway')).toBeInTheDocument();
    const alphaOption = screen.getByRole('option', { name: /Alpha Club/ });
    expect(within(alphaOption).queryByText(/Outside their category/)).not.toBeInTheDocument();
    fireEvent.click(betaOption);

    fireEvent.click(saveButtons()[0]);

    await waitFor(() => expect(writes()).toContain('assign'));
    expect(calls.log.find((c) => c.op === 'assign')?.variables).toEqual({
      id: 'ca1',
      club_ids: ['c1', 'c2'],
    });
  });
});
