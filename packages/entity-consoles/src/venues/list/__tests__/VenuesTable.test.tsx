import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { formatDate } from '@duncit/app-settings';
import type { TablePage, TableQueryState } from '@duncit/table';
import VenuesTable from '../VenuesTable';
import type { VenueRow } from '../queries';

const makeRow = (over: Partial<VenueRow> = {}): VenueRow => ({
  id: 'venue-1',
  venue_name: 'The Board Room Cafe',
  venue_type: 'Cafe',
  city: 'Bengaluru',
  locality: 'Indiranagar',
  capacity: 40,
  status: 'APPROVED',
  is_active: true,
  pod_count: 18,
  owner_name: 'Asha Rao',
  owner_email: 'asha@duncit.com',
  owner_phone: '+919876543210',
  created_at: '2026-02-20T08:00:00.000Z',
  venue_category: {
    super_category_name: 'For You',
    category_name: 'Games',
    sub_category_name: 'Board Games',
  },
  ...over,
});

/** A venue whose owner filed nothing but a name — every optional field blank. */
const bareRow = makeRow({
  id: 'venue-2',
  venue_name: 'Blank Slate Studio',
  venue_type: null,
  city: null,
  locality: null,
  capacity: null,
  status: 'DRAFT',
  is_active: false,
  pod_count: null,
  owner_name: null,
  owner_email: null,
  owner_phone: null,
  created_at: null,
  venue_category: null,
});

const fetchFor = (rows: VenueRow[]) =>
  vi.fn(async (_q: TableQueryState): Promise<TablePage<VenueRow>> => ({ rows, total: rows.length }));

const renderTable = (fetchRows: ReturnType<typeof fetchFor>, superCategoryId = '') => {
  const refetchRef = { current: null as (() => void) | null };
  const ui = (id: string) => (
    <MemoryRouter initialEntries={['/venues']}>
      <Routes>
        <Route
          path="/venues"
          element={<VenuesTable fetchRows={fetchRows} refetchRef={refetchRef} superCategoryId={id} />}
        />
        <Route path="/venues/:venueId" element={<div>VENUE RECORD ROUTE</div>} />
      </Routes>
    </MemoryRouter>
  );
  const view = render(ui(superCategoryId));
  return { ...view, refetchRef, rerenderWith: (id: string) => view.rerender(ui(id)) };
};

/** The grid cell of `field` in the row `rowId` renders into. */
const cell = (rowId: string, field: string) => {
  const found = document.querySelector(`[row-id="${rowId}"] [col-id="${field}"]`);
  if (!found) throw new Error(`no ${field} cell for row ${rowId}`);
  return found as HTMLElement;
};

beforeEach(() => {
  globalThis.localStorage.clear();
});

describe('VenuesTable', () => {
  it('asks for the newest venues first, with no super category pinned, and says when none match', async () => {
    const fetchRows = fetchFor([]);
    renderTable(fetchRows);

    expect(await screen.findByText('No venues found.')).toBeInTheDocument();
    const query = fetchRows.mock.calls[0][0];
    expect(query).toMatchObject({ sortBy: 'created_at', sortDir: 'desc' });
    expect(query.filters).toEqual([]);
    expect(screen.getByPlaceholderText('Search name, type, city or owner')).toBeInTheDocument();
  });

  it('reads a fully-filed venue across every column', async () => {
    renderTable(fetchFor([makeRow()]));

    await screen.findByText('The Board Room Cafe');
    for (const header of ['Venue', 'Category', 'Location', 'Owner', 'Capacity', 'Status', 'Active', 'Pods', 'Created']) {
      expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument();
    }
    expect(cell('venue-1', 'venue_name')).toHaveTextContent('The Board Room CafeCafe');
    expect(cell('venue-1', 'venue_category')).toHaveTextContent('For You > Games > Board Games');
    expect(cell('venue-1', 'locality')).toHaveTextContent('Indiranagar, Bengaluru');
    expect(cell('venue-1', 'owner_name')).toHaveTextContent('Asha Rao+919876543210');
    expect(cell('venue-1', 'capacity')).toHaveTextContent('40');
    expect(cell('venue-1', 'status')).toHaveTextContent('APPROVED');
    expect(cell('venue-1', 'is_active')).toHaveTextContent('Active');
    expect(cell('venue-1', 'pod_count')).toHaveTextContent('18');
    expect(cell('venue-1', 'created_at')).toHaveTextContent(formatDate('2026-02-20T08:00:00.000Z'));
  });

  it('dashes every blank field, reads inactive and counts no pods as zero', async () => {
    renderTable(fetchFor([bareRow]));

    await screen.findByText('Blank Slate Studio');
    expect(cell('venue-2', 'venue_name')).toHaveTextContent('Blank Slate Studio—');
    expect(cell('venue-2', 'venue_category')).toHaveTextContent('—');
    expect(cell('venue-2', 'locality')).toHaveTextContent('—');
    expect(cell('venue-2', 'owner_name')).toHaveTextContent('——');
    expect(cell('venue-2', 'is_active')).toHaveTextContent('Inactive');
    expect(cell('venue-2', 'pod_count')).toHaveTextContent('0');
    expect(cell('venue-2', 'created_at')).toHaveTextContent('—');
  });

  it("falls back to the owner's email when no phone is on file, and to what category is set", async () => {
    renderTable(
      fetchFor([
        makeRow({
          id: 'venue-3',
          owner_phone: '',
          locality: '',
          venue_category: { super_category_name: 'For Your Pet', category_name: null, sub_category_name: null },
        }),
      ]),
    );

    await screen.findByText('asha@duncit.com');
    expect(cell('venue-3', 'owner_name')).toHaveTextContent('Asha Raoasha@duncit.com');
    expect(cell('venue-3', 'locality')).toHaveTextContent('Bengaluru');
    expect(cell('venue-3', 'venue_category')).toHaveTextContent('For Your Pet');
  });

  it("opens the venue's record when its row is clicked", async () => {
    renderTable(fetchFor([makeRow()]));

    fireEvent.click(await screen.findByText('The Board Room Cafe'));

    expect(await screen.findByText('VENUE RECORD ROUTE')).toBeInTheDocument();
  });

  it('pins the picked super category as a page filter and refetches when it changes', async () => {
    const fetchRows = fetchFor([makeRow()]);
    const { rerenderWith, refetchRef } = renderTable(fetchRows, 'sc-1');

    await screen.findByText('The Board Room Cafe');
    expect(fetchRows.mock.lastCall?.[0].filters).toEqual([
      { field: 'super_category_id', op: 'eq', value: 'sc-1' },
    ]);
    expect(refetchRef.current).toBeTypeOf('function');

    fetchRows.mockClear();
    rerenderWith('');
    await waitFor(() => expect(fetchRows).toHaveBeenCalled());
    expect(fetchRows.mock.lastCall?.[0].filters).toEqual([]);
  });
});
