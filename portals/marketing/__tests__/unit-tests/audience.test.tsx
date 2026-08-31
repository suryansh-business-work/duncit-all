import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Route } from 'react-router';
import { allFallbackEntries, createTranslator } from '@duncit/app-settings';
import { renderWithProviders } from '../testkit';
import {
  addAudienceListMembersMock,
  audienceFilterOptionsEmptyMock,
  audienceFilterOptionsMock,
  audienceListCandidatesMock,
  audienceListMissingMock,
  audienceListMock,
  audienceListFailedMock,
  audienceListOwnersEmptyMock,
  audienceListOwnersMock,
  createAudienceListMock,
  deleteAudienceListMock,
  makeAudienceListRow,
  makeAudienceRow,
  makePickableUser,
  makeSparseAudienceRow,
  removeAudienceListMemberMock,
} from '../mocks';
import { __setTableRows, fetchRowsFrom } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (d: Date) => `fmt:${d.toISOString()}` }),
}));
const locationsMock = vi.hoisted(() => ({ locations: [] as unknown[] }));
vi.mock('@duncit/location', () => ({
  useAdminLocations: () => ({ locations: locationsMock.locations }),
}));
const userMock = vi.hoisted(() => ({
  user: { user_id: 'me', full_name: 'Asha Rao' } as Record<string, unknown> | null,
}));
vi.mock('@duncit/user-context', () => ({ useUserData: () => ({ user: userMock.user }) }));
const navigateMock = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigateMock.fn,
}));
const dialogsMock = vi.hoisted(() => ({ notifySuccess: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifySuccess: dialogsMock.notifySuccess,
}));

import AudienceListsPage from '../../src/pages/target-audience-page/AudienceListsPage';
import AudienceListDetailPage from '../../src/pages/target-audience-page/AudienceListDetailPage';
import CreateAudienceListPage from '../../src/pages/target-audience-page/CreateAudienceListPage';
import AudienceTable from '../../src/pages/target-audience-page/AudienceTable';
import AudiencePicker from '../../src/pages/target-audience-page/AudiencePicker';
import { getAudienceColumns } from '../../src/pages/target-audience-page/columns';
import { getAudienceListColumns } from '../../src/pages/target-audience-page/audience-list-columns';
import { EMPTY_FILTERS } from '../../src/pages/target-audience-page/audience-filters';
import { locationOptions, toOptions } from '../../src/pages/target-audience-page/helpers';

/** The same translator the provider-free `useTranslation` falls back to, so a
 * column built here is labelled with the copy that actually ships. */
const { t } = createTranslator({ locale: 'en-IN', fallback: allFallbackEntries() });

const LOCATIONS = [
  {
    id: 'l1',
    country: 'India',
    country_code: 'IN',
    state: 'Maharashtra',
    state_code: 'MH',
    city: 'Pune',
    location_zones: [{ zone_name: 'Kothrud' }, { zone_name: '' }],
  },
  { id: 'l2', country: 'India', country_code: 'IN', state: 'Delhi', state_code: 'DL', city: 'New Delhi', location_zones: null },
];

const columnDeps = { formatDate: (d: Date) => d.toISOString() };

beforeEach(() => {
  __setTableRows([]);
  locationsMock.locations = LOCATIONS;
  userMock.user = { user_id: 'me', full_name: 'Asha Rao' };
  navigateMock.fn.mockClear();
  dialogsMock.notifySuccess.mockClear();
});

describe('audience helpers', () => {
  it('derives location dropdowns from the admin tree, deduped and sorted', () => {
    expect(locationOptions(LOCATIONS as never)).toEqual({
      country: [{ value: 'India', label: 'India' }],
      state: [
        { value: 'Delhi', label: 'Delhi' },
        { value: 'Maharashtra', label: 'Maharashtra' },
      ],
      city: [
        { value: 'New Delhi', label: 'New Delhi' },
        { value: 'Pune', label: 'Pune' },
      ],
      zone: [{ value: 'Kothrud', label: 'Kothrud' }],
    });
  });

  it('handles an empty location tree', () => {
    expect(locationOptions([])).toEqual({ country: [], state: [], city: [], zone: [] });
  });

  it('turns a plain string list into options', () => {
    expect(toOptions(['HOST'])).toEqual([{ value: 'HOST', label: 'HOST' }]);
  });
});

describe('audience columns', () => {
  // Filtering moved to the sidebar; a column popover can only ever show one.
  it('carries no column filters at all', () => {
    expect(getAudienceColumns(columnDeps, t).filter((c) => c.filter)).toEqual([]);
  });

  // The audience directory and the create wizard's preview render the same
  // table against no list, so there is nothing there to remove somebody from.
  it('carries no Actions column until the page hands it a remove handler', () => {
    const fields = getAudienceColumns(columnDeps, t).map((c) => c.field);
    expect(fields).not.toContain('actions');
    expect(getAudienceColumns({ ...columnDeps, onRemove: vi.fn() }, t).map((c) => c.field)).toContain(
      'actions',
    );
  });

  it('renders a fully populated row', async () => {
    renderWithProviders(
      <AudienceTable fetchRows={fetchRowsFrom([makeAudienceRow()]) as never} columnDeps={columnDeps} externalFilters={[]} />,
    );
    const row = await screen.findByTestId('table-row');
    expect(within(row).getByTestId('cell-first_name')).toHaveTextContent('Asha Rao');
    expect(within(row).getByTestId('cell-age')).toHaveTextContent('29');
    expect(within(row).getByTestId('cell-city')).toHaveTextContent('Pune');
    expect(within(row).getByTestId('cell-whatsapp')).toHaveTextContent('Yes');
    expect(within(row).getByTestId('cell-push_platform')).toHaveTextContent('ANDROID');
  });

  it('falls back to an em dash across a row with nothing filled in', async () => {
    renderWithProviders(
      <AudienceTable fetchRows={fetchRowsFrom([makeSparseAudienceRow()]) as never} columnDeps={columnDeps} externalFilters={[]} />,
    );
    const row = await screen.findByTestId('table-row');
    expect(within(row).getByTestId('cell-age')).toHaveTextContent('—');
    expect(within(row).getByTestId('cell-whatsapp')).toHaveTextContent('No');
    expect(within(row).getByTestId('cell-email_verified')).toHaveTextContent('No');
    expect(within(row).getByTestId('cell-role')).toHaveTextContent('—');
    expect(within(row).getByTestId('cell-push_platform')).toHaveTextContent('—');
  });
});

describe('AudiencePicker', () => {
  it('renders the filter sidebar beside the people it matches', async () => {
    __setTableRows([makeAudienceRow()]);
    renderWithProviders(<AudiencePicker filters={EMPTY_FILTERS} onFiltersChange={vi.fn()} />, {
      mocks: [audienceFilterOptionsMock],
    });
    expect(await screen.findByTestId('audience-filters')).toBeInTheDocument();
    expect(await screen.findByTestId('table-row')).toBeInTheDocument();
  });

  it('renders before the fetched dropdown options arrive', async () => {
    locationsMock.locations = [];
    renderWithProviders(<AudiencePicker filters={EMPTY_FILTERS} onFiltersChange={vi.fn()} />, {
      mocks: [audienceFilterOptionsEmptyMock],
    });
    expect(await screen.findByTestId('table-empty')).toBeInTheDocument();
  });
});

describe('audience list columns', () => {
  const cols = () =>
    getAudienceListColumns({ formatDate: (d) => d.toISOString(), onDelete: vi.fn() }, t);
  const cell = (field: string, row: ReturnType<typeof makeAudienceListRow>) =>
    render(<>{cols().find((c) => c.field === field)?.cellRenderer?.(row)}</>);

  it('reads the sortable value off each column', () => {
    const row = makeAudienceListRow();
    expect(cols().find((c) => c.field === 'name')?.valueGetter?.(row)).toBe('Pune regulars');
    expect(cols().find((c) => c.field === 'owner')?.valueGetter?.(row)).toBe('Asha Rao');
    expect(cols().find((c) => c.field === 'member_count')?.valueGetter?.(row)).toBe(1284);
    expect(cols().find((c) => c.field === 'criteria')?.valueGetter?.(row)).toBe(1);
  });

  it('renders the name over its description, and a dash when there is none', () => {
    const { unmount } = cell('name', makeAudienceListRow());
    expect(screen.getByText('Everyone browsing Pune')).toBeInTheDocument();
    unmount();

    cell('name', makeAudienceListRow({ description: '' }));
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders the member count, greyed out when the segment is empty', () => {
    const { unmount } = cell('member_count', makeAudienceListRow());
    expect(screen.getByText('1,284')).toBeInTheDocument();
    unmount();

    cell('member_count', makeAudienceListRow({ member_count: 0 }));
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('summarises the criteria, singular, plural and none', () => {
    const one = cell('criteria', makeAudienceListRow());
    expect(screen.getByText('1 filter')).toBeInTheDocument();
    one.unmount();

    const many = cell(
      'criteria',
      makeAudienceListRow({
        filters: [
          { field: 'city', op: 'in', value: null, values: ['Pune'] },
          { field: 'status', op: 'eq', value: 'ACTIVE', values: [] },
        ],
      }),
    );
    expect(screen.getByText('2 filters')).toBeInTheDocument();
    many.unmount();

    cell('criteria', makeAudienceListRow({ filters: [] }));
    expect(screen.getByText('Everyone')).toBeInTheDocument();
  });
});

describe('AudienceListsPage', () => {
  it('lists saved lists and opens one on click', async () => {
    __setTableRows([makeAudienceListRow()]);
    renderWithProviders(<AudienceListsPage />, { mocks: [] });
    expect(await screen.findByText('Target Audience')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create list/ })).toBeInTheDocument();
    const row = await screen.findByTestId('table-row');
    // The mock renders the valueGetter text and the cellRenderer, so the name
    // appears twice in one cell — assert on the cell, not the text.
    expect(within(row).getByTestId('cell-name')).toHaveTextContent('Pune regulars');
    expect(within(row).getByTestId('cell-owner')).toHaveTextContent('Asha Rao');

    fireEvent.click(screen.getByText('rowclick-0'));
    expect(navigateMock.fn).toHaveBeenCalledWith('/audience/l1');
  });

  it('says so when there are no lists yet', async () => {
    renderWithProviders(<AudienceListsPage />, { mocks: [] });
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('No audience lists yet');
  });

  it('starts the create wizard', async () => {
    renderWithProviders(<AudienceListsPage />, { mocks: [] });
    fireEvent.click(await screen.findByRole('button', { name: /Create list/ }));
    expect(navigateMock.fn).toHaveBeenCalledWith('/audience/new');
  });

  it('deletes a list after confirming', async () => {
    __setTableRows([makeAudienceListRow()]);
    renderWithProviders(<AudienceListsPage />, { mocks: [deleteAudienceListMock('l1')] });
    await screen.findByTestId('table-row');
    fireEvent.click(screen.getByRole('button', { name: 'Delete list' }));
    expect(await screen.findByText('Delete this audience list?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('“Pune regulars” deleted'));
  });

  it('surfaces a failed delete instead of closing silently', async () => {
    __setTableRows([makeAudienceListRow()]);
    renderWithProviders(<AudienceListsPage />, {
      mocks: [deleteAudienceListMock('l1', 'nope')],
    });
    await screen.findByTestId('table-row');
    fireEvent.click(screen.getByRole('button', { name: 'Delete list' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(await screen.findByText(/nope/)).toBeInTheDocument();
  });

  it('closes the confirm without deleting', async () => {
    __setTableRows([makeAudienceListRow()]);
    renderWithProviders(<AudienceListsPage />, { mocks: [] });
    await screen.findByTestId('table-row');
    fireEvent.click(screen.getByRole('button', { name: 'Delete list' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText('Delete this audience list?')).not.toBeInTheDocument());
  });
});

describe('AudienceListDetailPage', () => {
  const renderDetail = (mocks: never[] | Parameters<typeof renderWithProviders>[1]['mocks'], id = 'l1') =>
    renderWithProviders(<div />, {
      mocks,
      initialEntries: [`/audience/${id}`],
      routes: <Route path="/audience/:listId" element={<AudienceListDetailPage />} />,
    });

  it('shows the list, its live count and its criteria', async () => {
    __setTableRows([makeAudienceRow()]);
    renderDetail([audienceListMock()]);
    expect(await screen.findByText('Pune regulars')).toBeInTheDocument();
    expect(screen.getByText('Owned by Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('Everyone browsing Pune')).toBeInTheDocument();
    expect(screen.getByText('1,284 people right now')).toBeInTheDocument();
    expect(screen.getByText('city: Pune')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to audience lists' }));
    expect(navigateMock.fn).toHaveBeenCalledWith('/audience');
  });

  it('surfaces a failed load instead of an endless spinner', async () => {
    renderDetail([audienceListFailedMock('l1', 'boom')]);
    expect(await screen.findByText(/boom/)).toBeInTheDocument();
  });

  it('labels an unfiltered list as everyone, and omits an empty description', async () => {
    renderDetail([
      audienceListMock(makeAudienceListRow({ filters: [], description: '', member_count: 9 })),
    ]);
    expect(await screen.findByText('No filters — everyone')).toBeInTheDocument();
    expect(screen.queryByText('Everyone browsing Pune')).not.toBeInTheDocument();
  });

  it('renders a single-value criterion', async () => {
    renderDetail([
      audienceListMock(
        makeAudienceListRow({ filters: [{ field: 'status', op: 'eq', value: 'ACTIVE', values: [] }] }),
      ),
    ]);
    expect(await screen.findByText('status: ACTIVE')).toBeInTheDocument();
  });

  it('renders a bare criterion that carries neither a value nor values', async () => {
    renderDetail([
      audienceListMock(
        makeAudienceListRow({ filters: [{ field: 'whatsapp', op: 'is_true', value: null, values: [] }] }),
      ),
    ]);
    expect(await screen.findByText('whatsapp')).toBeInTheDocument();
  });

  it('says so when the list is gone', async () => {
    renderDetail([audienceListMissingMock('gone')], 'gone');
    expect(await screen.findByText('That audience list no longer exists.')).toBeInTheDocument();
  });

  it('reports how many people were taken out by hand', async () => {
    renderDetail([audienceListMock(makeAudienceListRow({ excluded_member_count: 3 }))]);
    expect(await screen.findByText('3 removed by hand')).toBeInTheDocument();
  });

  it('keeps the removed chip off a list nobody has been taken out of', async () => {
    renderDetail([audienceListMock()]);
    await screen.findByText('Pune regulars');
    expect(screen.queryByText(/removed by hand/)).not.toBeInTheDocument();
  });

  describe('removing one person', () => {
    /** The members table, showing Asha, with the list loaded behind it. */
    const renderRoster = (extra: Parameters<typeof renderWithProviders>[1]['mocks'] = []) => {
      __setTableRows([makeAudienceRow()]);
      return renderDetail([audienceListMock(), ...(extra ?? [])]);
    };

    const openConfirm = async () => {
      await screen.findByTestId('table-row');
      fireEvent.click(screen.getByRole('button', { name: 'Remove from this list' }));
      return screen.findByText('Remove this person from the list?');
    };

    it('names the person and says the removal sticks', async () => {
      renderRoster();
      await openConfirm();
      // A list re-runs its criteria, so "stays out" is the part that matters.
      expect(screen.getByText(/Asha Rao will be taken out of this list and stay out/)).toBeInTheDocument();
    });

    it('takes them out once the removal is confirmed', async () => {
      renderRoster([removeAudienceListMemberMock('u1')]);
      await openConfirm();
      fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
      await waitFor(() =>
        expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('Removed from the list'),
      );
    });

    it('surfaces a failed removal instead of closing on a lie', async () => {
      renderRoster([removeAudienceListMemberMock('u1', { failWith: 'still sending to them' })]);
      await openConfirm();
      fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
      expect(await screen.findByText(/still sending to them/)).toBeInTheDocument();
      expect(dialogsMock.notifySuccess).not.toHaveBeenCalled();
    });

    it('closes the confirm without removing anybody', async () => {
      renderRoster();
      await openConfirm();
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      await waitFor(() =>
        expect(screen.queryByText('Remove this person from the list?')).not.toBeInTheDocument(),
      );
    });

    // A phone signup has no name and no email; a confirmation naming nobody is
    // not a confirmation.
    it('falls back to the phone number when the account has no name', async () => {
      __setTableRows([makeSparseAudienceRow()]);
      renderDetail([audienceListMock()]);
      await screen.findByTestId('table-row');
      fireEvent.click(screen.getByRole('button', { name: 'Remove from this list' }));
      expect(await screen.findByText(/^u2 will be taken out/)).toBeInTheDocument();
    });
  });

  describe('adding people', () => {
    const openPicker = async () => {
      fireEvent.click(await screen.findByRole('button', { name: /Add user/ }));
      return screen.findByText('Add people to this list');
    };

    // The whole point: the picker asks for CANDIDATES keyed on this list, so
    // whoever is already in it never reaches the checkbox list.
    it('offers only people the list does not already hold', async () => {
      renderDetail([audienceListMock(), audienceListCandidatesMock()]);
      await openPicker();
      expect(await screen.findByText('Vikram Nair')).toBeInTheDocument();
      expect(screen.queryByText('Asha Rao', { selector: 'span' })).not.toBeInTheDocument();
    });

    it('says everybody is already in rather than blaming the search', async () => {
      renderDetail([audienceListMock(), audienceListCandidatesMock([])]);
      await openPicker();
      expect(await screen.findByText('Everyone eligible is already in this list.')).toBeInTheDocument();
    });

    it('adds the people that were ticked', async () => {
      renderDetail([
        audienceListMock(),
        audienceListCandidatesMock(),
        addAudienceListMembersMock(['u9']),
      ]);
      await openPicker();
      fireEvent.click(await screen.findByText('Vikram Nair'));
      expect(screen.getByText('1 selected')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Add' }));
      await waitFor(() =>
        expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('People added to the list'),
      );
    });

    it('surfaces a failed add', async () => {
      renderDetail([
        audienceListMock(),
        audienceListCandidatesMock([makePickableUser()]),
        addAudienceListMembersMock(['u9'], { failWith: 'they closed their account' }),
      ]);
      await openPicker();
      fireEvent.click(await screen.findByText('Vikram Nair'));
      fireEvent.click(screen.getByRole('button', { name: 'Add' }));
      expect(await screen.findByText(/they closed their account/)).toBeInTheDocument();
    });
  });
});

describe('CreateAudienceListPage', () => {
  const listInput = {
    name: 'Pune 25+',
    description: 'For the Diwali push',
    owner: 'Asha Rao',
    owner_user_id: 'me',
    filters: [],
  };

  const renderPage = (mocks: Parameters<typeof renderWithProviders>[1]['mocks']) =>
    renderWithProviders(<CreateAudienceListPage />, { mocks });

  const goToStepTwo = async () => {
    fireEvent.click(await screen.findByTestId('audience-step-next'));
    expect(await screen.findByText('Name this list')).toBeInTheDocument();
  };

  const fillNameAndDescription = () => {
    fireEvent.change(screen.getByLabelText(/List name/), { target: { value: listInput.name } });
    fireEvent.change(screen.getByLabelText(/List description/), {
      target: { value: listInput.description },
    });
  };

  const pickOwner = async (name: string) => {
    fireEvent.mouseDown(screen.getByLabelText(/List owner/));
    fireEvent.click(await screen.findByText(name));
  };

  // The wizard's actions sit above the audience table: step 1 is full-height,
  // so a Next button underneath it is off-screen the moment the list is big.
  it('keeps Next and Save at the top, above the audience', async () => {
    renderPage([audienceFilterOptionsMock, audienceListOwnersMock]);
    const next = await screen.findByTestId('audience-step-next');
    const stepper = screen.getByText('Choose the audience');
    expect(next.compareDocumentPosition(stepper) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(next);
    const save = await screen.findByRole('button', { name: /Save list/ });
    expect(save.compareDocumentPosition(screen.getByText('Name this list')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('walks step 1 to step 2 and back', async () => {
    renderPage([audienceFilterOptionsMock, audienceListOwnersMock]);
    await goToStepTwo();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByTestId('audience-step-next')).toBeInTheDocument();
  });

  it('pre-selects the signed-in user as owner when they can open this portal', async () => {
    renderPage([audienceFilterOptionsMock, audienceListOwnersMock]);
    await goToStepTwo();
    await waitFor(() => expect(screen.getByLabelText(/List owner/)).toHaveValue('Asha Rao'));
  });

  it('leaves the owner blank when the signed-in user is not an eligible owner', async () => {
    userMock.user = { user_id: 'someone-else', full_name: 'Nobody' };
    renderPage([audienceFilterOptionsMock, audienceListOwnersMock]);
    await goToStepTwo();
    expect(screen.getByLabelText(/List owner/)).toHaveValue('');
  });

  it('offers everyone with portal access, flagging the admins', async () => {
    renderPage([audienceFilterOptionsMock, audienceListOwnersMock]);
    await goToStepTwo();
    fireEvent.mouseDown(screen.getByLabelText(/List owner/));
    expect(await screen.findByText('Ravi Boss')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('ravi@duncit.com')).toBeInTheDocument();
  });

  // "Dropdown with search": a typeable combobox, not a plain select. The
  // filtering itself is MUI's own filterOptions, so what is asserted here is
  // that the control really is searchable and that a typed pick round-trips.
  it('is a searchable combobox, not a fixed select', async () => {
    userMock.user = null;
    renderPage([audienceFilterOptionsMock, audienceListOwnersMock]);
    await goToStepTwo();
    const input = screen.getByLabelText(/List owner/);
    expect(input).toHaveAttribute('role', 'combobox');
    expect(input).not.toHaveAttribute('readonly');

    fireEvent.change(input, { target: { value: 'Ravi' } });
    fireEvent.click(within(await screen.findByRole('listbox')).getByText('Ravi Boss'));
    expect(screen.getByLabelText(/List owner/)).toHaveValue('Ravi Boss');
  });

  it('falls back to the email for an account with no name yet', async () => {
    userMock.user = null;
    renderPage([audienceFilterOptionsMock, audienceListOwnersMock]);
    await goToStepTwo();
    fireEvent.mouseDown(screen.getByLabelText(/List owner/));
    // The email is both the label and the secondary line for this account.
    const listbox = within(await screen.findByRole('listbox'));
    fireEvent.click(listbox.getByRole('option', { name: /new\.hire@duncit\.com/ }));
    expect(screen.getByLabelText(/List owner/)).toHaveValue('new.hire@duncit.com');
  });

  it('lets you clear the owner again', async () => {
    renderPage([audienceFilterOptionsMock, audienceListOwnersMock]);
    await goToStepTwo();
    await waitFor(() => expect(screen.getByLabelText(/List owner/)).toHaveValue('Asha Rao'));

    fireEvent.click(screen.getByTitle('Clear'));
    expect(screen.getByLabelText(/List owner/)).toHaveValue('');
  });

  it('says so when nobody can own a list', async () => {
    renderPage([audienceFilterOptionsMock, audienceListOwnersEmptyMock]);
    await goToStepTwo();
    fireEvent.mouseDown(screen.getByLabelText(/List owner/));
    expect(await screen.findByText('Nobody has access to this portal yet')).toBeInTheDocument();
  });

  it('refuses to save without a name', async () => {
    renderPage([audienceFilterOptionsMock, audienceListOwnersMock]);
    await goToStepTwo();
    fireEvent.click(screen.getByRole('button', { name: /Save list/ }));
    expect(await screen.findByText('Give the list a name')).toBeInTheDocument();
  });

  it('refuses to save without an owner', async () => {
    userMock.user = null;
    renderPage([audienceFilterOptionsMock, audienceListOwnersMock]);
    await goToStepTwo();
    fillNameAndDescription();
    fireEvent.click(screen.getByRole('button', { name: /Save list/ }));
    expect(await screen.findByText('Pick who owns this list')).toBeInTheDocument();
  });

  it('saves the list with the owner resolved from the picked account', async () => {
    userMock.user = null;
    renderPage([
      audienceFilterOptionsMock,
      audienceListOwnersMock,
      createAudienceListMock(listInput),
    ]);
    await goToStepTwo();
    fillNameAndDescription();
    await pickOwner('Asha Rao');
    fireEvent.click(screen.getByRole('button', { name: /Save list/ }));
    await waitFor(() =>
      expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('“Pune 25+” saved'),
    );
    expect(navigateMock.fn).toHaveBeenCalledWith('/audience');
  });

  it('shows how many people match, before Next', async () => {
    __setTableRows([makeAudienceRow(), makeAudienceRow({ id: 'u2' })]);
    renderPage([audienceFilterOptionsMock, audienceListOwnersMock]);
    const count = await screen.findByTestId('audience-match-count');
    await waitFor(() => expect(count).toHaveTextContent('2 people'));

    const next = screen.getByTestId('audience-step-next');
    expect(count.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('says one person, not one people', async () => {
    __setTableRows([makeAudienceRow()]);
    renderPage([audienceFilterOptionsMock, audienceListOwnersMock]);
    await waitFor(() =>
      expect(screen.getByTestId('audience-match-count')).toHaveTextContent('1 person'),
    );
  });

  it('carries the count into step 2, where it goes back to the filters', async () => {
    __setTableRows([makeAudienceRow(), makeAudienceRow({ id: 'u2' })]);
    renderPage([audienceFilterOptionsMock, audienceListOwnersMock]);
    await goToStepTwo();
    const count = screen.getByTestId('audience-match-count');
    expect(count).toHaveTextContent('2 people');

    fireEvent.click(count);
    expect(await screen.findByTestId('audience-step-next')).toBeInTheDocument();
  });

  describe('leaving the wizard', () => {
    it('goes straight back when no filter is applied', async () => {
      renderPage([audienceFilterOptionsMock, audienceListOwnersMock]);
      fireEvent.click(await screen.findByRole('button', { name: 'Back to audience lists' }));
      expect(navigateMock.fn).toHaveBeenCalledWith('/audience');
    });

    it('warns before discarding applied filters', async () => {
      renderPage([audienceFilterOptionsMock, audienceListOwnersMock]);
      fireEvent.change(await screen.findByLabelText('Age from'), { target: { value: '25' } });

      fireEvent.click(screen.getByRole('button', { name: 'Back to audience lists' }));
      expect(await screen.findByText('Leave without saving?')).toBeInTheDocument();
      expect(screen.getByText(/1 filter applied/)).toBeInTheDocument();
      expect(navigateMock.fn).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'Discard filters' }));
      expect(navigateMock.fn).toHaveBeenCalledWith('/audience');
    });

    it('pluralises the warning and lets you stay', async () => {
      renderPage([audienceFilterOptionsMock, audienceListOwnersMock]);
      fireEvent.change(await screen.findByLabelText('Age from'), { target: { value: '25' } });
      fireEvent.change(screen.getByLabelText('Age to'), { target: { value: '34' } });
      fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'en-IN' } });

      fireEvent.click(screen.getByRole('button', { name: 'Back to audience lists' }));
      expect(await screen.findByText(/2 filters applied/)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      await waitFor(() => expect(screen.queryByText('Leave without saving?')).not.toBeInTheDocument());
      expect(navigateMock.fn).not.toHaveBeenCalled();
    });
  });

  it('keeps you on the form when the save fails', async () => {
    renderPage([
      audienceFilterOptionsMock,
      audienceListOwnersMock,
      createAudienceListMock(listInput, 'server said no'),
    ]);
    await goToStepTwo();
    fillNameAndDescription();
    fireEvent.click(screen.getByRole('button', { name: /Save list/ }));
    expect(await screen.findByText(/server said no/)).toBeInTheDocument();
    expect(screen.getByText('Name this list')).toBeInTheDocument();
  });
});
