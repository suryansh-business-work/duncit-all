import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Route } from 'react-router-dom';
import { renderWithProviders } from '../testkit';
import {
  audienceFilterOptionsEmptyMock,
  audienceFilterOptionsMock,
  audienceListMissingMock,
  audienceListMock,
  audienceListFailedMock,
  createAudienceListMock,
  deleteAudienceListMock,
  makeAudienceListRow,
  makeAudienceRow,
  makeSparseAudienceRow,
} from '../mocks';
import { __setTableRows, fetchRowsFrom } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', () => ({
  useDateFormat: () => ({ formatDateTime: (d: Date) => `fmt:${d.toISOString()}` }),
}));
const locationsMock = vi.hoisted(() => ({ locations: [] as unknown[] }));
vi.mock('@duncit/location', () => ({
  useAdminLocations: () => ({ locations: locationsMock.locations }),
}));
const userMock = vi.hoisted(() => ({ user: { full_name: 'Asha Rao' } as Record<string, unknown> | null }));
vi.mock('@duncit/user-context', () => ({ useUserData: () => ({ user: userMock.user }) }));
const navigateMock = vi.hoisted(() => ({ fn: vi.fn() }));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
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
  userMock.user = { full_name: 'Asha Rao' };
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
    expect(getAudienceColumns(columnDeps).filter((c) => c.filter)).toEqual([]);
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
  const cols = () => getAudienceListColumns({ formatDate: (d) => d.toISOString(), onDelete: vi.fn() });
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
});

describe('CreateAudienceListPage', () => {
  const listInput = {
    name: 'Pune 25+',
    description: 'For the Diwali push',
    owner: 'Asha Rao',
    filters: [],
  };

  const goToStepTwo = async () => {
    expect(await screen.findByTestId('audience-filters')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('audience-step-next'));
    expect(await screen.findByText('Name this list')).toBeInTheDocument();
  };

  const fillForm = () => {
    fireEvent.change(screen.getByLabelText(/List name/), { target: { value: listInput.name } });
    fireEvent.change(screen.getByLabelText(/List description/), {
      target: { value: listInput.description },
    });
  };

  it('walks step 1 to step 2 and back', async () => {
    renderWithProviders(<CreateAudienceListPage />, { mocks: [audienceFilterOptionsMock] });
    await goToStepTwo();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByTestId('audience-filters')).toBeInTheDocument();
  });

  it('pre-fills the owner with whoever is signed in', async () => {
    renderWithProviders(<CreateAudienceListPage />, { mocks: [audienceFilterOptionsMock] });
    await goToStepTwo();
    expect(screen.getByLabelText(/List owner/)).toHaveValue('Asha Rao');
  });

  it('falls back to the signed-in email when there is no name', async () => {
    userMock.user = { email: 'asha@example.com' };
    renderWithProviders(<CreateAudienceListPage />, { mocks: [audienceFilterOptionsMock] });
    await goToStepTwo();
    expect(screen.getByLabelText(/List owner/)).toHaveValue('asha@example.com');
  });

  it('leaves the owner blank when nobody is signed in', async () => {
    userMock.user = null;
    renderWithProviders(<CreateAudienceListPage />, { mocks: [audienceFilterOptionsMock] });
    await goToStepTwo();
    expect(screen.getByLabelText(/List owner/)).toHaveValue('');
  });

  it('refuses to save without a name', async () => {
    renderWithProviders(<CreateAudienceListPage />, { mocks: [audienceFilterOptionsMock] });
    await goToStepTwo();
    fireEvent.click(screen.getByRole('button', { name: /Save list/ }));
    expect(await screen.findByText('Give the list a name')).toBeInTheDocument();
  });

  it('saves the list and reports it', async () => {
    renderWithProviders(<CreateAudienceListPage />, {
      mocks: [audienceFilterOptionsMock, createAudienceListMock(listInput)],
    });
    await goToStepTwo();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /Save list/ }));
    await waitFor(() =>
      expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('“Pune 25+” saved'),
    );
    expect(navigateMock.fn).toHaveBeenCalledWith('/audience');
  });

  it('keeps you on the form when the save fails', async () => {
    renderWithProviders(<CreateAudienceListPage />, {
      mocks: [audienceFilterOptionsMock, createAudienceListMock(listInput, 'server said no')],
    });
    await goToStepTwo();
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /Save list/ }));
    expect(await screen.findByText(/server said no/)).toBeInTheDocument();
    expect(screen.getByText('Name this list')).toBeInTheDocument();
  });
});
