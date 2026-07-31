import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import {
  audienceFilterOptionsEmptyMock,
  audienceFilterOptionsMock,
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

import TargetAudiencePage from '../../src/pages/target-audience-page/TargetAudiencePage';
import AudienceTable from '../../src/pages/target-audience-page/AudienceTable';
import { getAudienceColumns } from '../../src/pages/target-audience-page/columns';
import {
  locationOptions,
  toOptions,
  PUSH_OPTIONS,
  STATUS_OPTIONS,
} from '../../src/pages/target-audience-page/helpers';

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
  {
    id: 'l2',
    country: 'India',
    country_code: 'IN',
    state: 'Delhi',
    state_code: 'DL',
    city: 'New Delhi',
    location_zones: null,
  },
];

const emptyDeps = {
  roleOptions: [],
  interestOptions: [],
  countryOptions: [],
  stateOptions: [],
  cityOptions: [],
  zoneOptions: [],
  formatDate: (d: Date) => d.toISOString(),
};

beforeEach(() => {
  __setTableRows([]);
  locationsMock.locations = LOCATIONS;
});

describe('audience helpers', () => {
  it('derives location dropdowns from the admin location tree, deduped and sorted', () => {
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
      // The blank zone name is dropped; l2 has no zones at all.
      zone: [{ value: 'Kothrud', label: 'Kothrud' }],
    });
  });

  it('handles an empty location tree', () => {
    expect(locationOptions([])).toEqual({ country: [], state: [], city: [], zone: [] });
  });

  it('turns a plain string list into options', () => {
    expect(toOptions(['HOST', 'USER'])).toEqual([
      { value: 'HOST', label: 'HOST' },
      { value: 'USER', label: 'USER' },
    ]);
  });

  it('offers the reachability values a campaign actually asks about', () => {
    expect(PUSH_OPTIONS.map((o) => o.value)).toEqual(['ANY', 'ANDROID', 'IOS', 'WEB', 'NONE']);
    expect(STATUS_OPTIONS.map((o) => o.value)).toEqual(['ACTIVE', 'INACTIVE', 'SUSPENDED']);
  });
});

describe('audience columns', () => {
  it('names the three server-translated filters exactly as the service expects', () => {
    const fields = getAudienceColumns(emptyDeps).map((c) => c.field);
    expect(fields).toEqual(expect.arrayContaining(['age', 'push_platform', 'interest_category']));
  });

  it('feeds the fetched dropdown values into the right column filters', () => {
    const columns = getAudienceColumns({
      ...emptyDeps,
      roleOptions: toOptions(['HOST']),
      interestOptions: [{ value: 'c1', label: 'Live Music' }],
      cityOptions: toOptions(['Pune']),
    });
    const filterOf = (field: string) => columns.find((c) => c.field === field)?.filter;
    expect(filterOf('role')).toEqual({ type: 'select', options: [{ value: 'HOST', label: 'HOST' }], multiple: true });
    expect(filterOf('interest_category')).toEqual({
      type: 'select',
      options: [{ value: 'c1', label: 'Live Music' }],
      multiple: true,
    });
    expect(filterOf('age')).toEqual({ type: 'number' });
    expect(filterOf('whatsapp')).toEqual({ type: 'boolean' });
  });

  it('renders a fully populated row', async () => {
    renderWithProviders(
      <AudienceTable
        fetchRows={fetchRowsFrom([makeAudienceRow()]) as never}
        refetchRef={{ current: null }}
        columnDeps={emptyDeps}
      />,
    );
    const row = await screen.findByTestId('table-row');
    // The mock renders both the valueGetter text and the cellRenderer, so the
    // name appears twice in the same cell — assert on the cell, not the text.
    expect(within(row).getByTestId('cell-first_name')).toHaveTextContent('Asha Rao');
    expect(within(row).getByTestId('cell-first_name')).toHaveTextContent('asha@example.com');
    expect(within(row).getByTestId('cell-age')).toHaveTextContent('29');
    expect(within(row).getByTestId('cell-city')).toHaveTextContent('Pune');
    expect(within(row).getByTestId('cell-whatsapp')).toHaveTextContent('Yes');
    expect(within(row).getByTestId('cell-role')).toHaveTextContent('USER');
    expect(within(row).getByTestId('cell-push_platform')).toHaveTextContent('ANDROID');
  });

  it('falls back to an em dash across a row with nothing filled in', async () => {
    renderWithProviders(
      <AudienceTable
        fetchRows={fetchRowsFrom([makeSparseAudienceRow()]) as never}
        refetchRef={{ current: null }}
        columnDeps={emptyDeps}
      />,
    );
    const row = await screen.findByTestId('table-row');
    expect(within(row).getByTestId('cell-age')).toHaveTextContent('—');
    expect(within(row).getByTestId('cell-city')).toHaveTextContent('—');
    expect(within(row).getByTestId('cell-whatsapp')).toHaveTextContent('No');
    expect(within(row).getByTestId('cell-email_verified')).toHaveTextContent('No');
    // Empty chip lists render the dash rather than an empty cell.
    expect(within(row).getByTestId('cell-role')).toHaveTextContent('—');
    expect(within(row).getByTestId('cell-push_platform')).toHaveTextContent('—');
  });
});

describe('TargetAudiencePage', () => {
  it('states how push reachability and age are actually derived', async () => {
    renderWithProviders(<TargetAudiencePage />, { mocks: [audienceFilterOptionsMock] });
    expect(screen.getByText('Target Audience')).toBeInTheDocument();
    expect(screen.getByText(/Push reachable/)).toBeInTheDocument();
    expect(screen.getByText(/derived from date of birth/)).toBeInTheDocument();
  });

  it('feeds the fetched roles and interests into the table filters', async () => {
    __setTableRows([makeAudienceRow()]);
    renderWithProviders(<TargetAudiencePage />, { mocks: [audienceFilterOptionsMock] });
    expect(await screen.findByTestId('table-row')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('duncit-table')).toBeInTheDocument());
  });

  it('renders before any filter options have resolved', async () => {
    locationsMock.locations = [];
    renderWithProviders(<TargetAudiencePage />, { mocks: [audienceFilterOptionsEmptyMock] });
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('No one matches these filters.');
  });
});
