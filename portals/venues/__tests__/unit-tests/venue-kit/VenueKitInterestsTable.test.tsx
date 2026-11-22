// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The interested-venues table. The shared table is @duncit/table's subject, so
 * it is a stand-in that hands back the columns; each column's getter and cell
 * are exercised against real rows.
 */
interface Column {
  field: string;
  valueGetter?: (row: Row) => unknown;
  cellRenderer?: (row: Row) => ReactNode;
  options?: { value: string; label: string }[];
}
interface Row {
  id: string;
  name: string;
  phone_extension: string;
  phone_number: string;
  phone_verified: boolean;
  source: 'WEBSITE' | 'VENUES_PORTAL';
  status: 'NEW' | 'CONTACTED' | 'CONVERTED' | 'NOT_INTERESTED';
  created_at: string;
  last_submitted_at: string;
}

const mocks = vi.hoisted(() => ({
  columns: [] as Column[],
  tableProps: {} as Record<string, unknown>,
  setStatus: vi.fn(),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
  warn: vi.fn(),
}));

vi.mock('@apollo/client/react', () => ({ useApolloClient: () => ({}), useMutation: () => [mocks.setStatus] }));
vi.mock('@duncit/table', () => ({
  useApolloTableFetch: () => 'fetch-rows',
  DuncitTable: (props: { columns: Column[] } & Record<string, unknown>) => {
    mocks.columns = props.columns;
    mocks.tableProps = props;
    return null;
  },
}));
vi.mock('@duncit/app-settings', () => ({ useDateFormat: () => ({ formatDateTime: (iso: string) => `at ${iso}` }) }));
vi.mock('@duncit/dialogs', () => ({ notifyError: mocks.notifyError, notifySuccess: mocks.notifySuccess }));
vi.mock('@duncit/logs', () => ({ logs: { portal: { venues: { warn: mocks.warn } } } }));

import VenueKitInterestsTable from '../../../src/pages/venue-kit/VenueKitInterestsTable';

const ROW: Row = {
  id: 'i1',
  name: 'Blue Tokai',
  phone_extension: '+91',
  phone_number: '9876543210',
  phone_verified: true,
  source: 'WEBSITE',
  status: 'NEW',
  created_at: '2026-11-22T10:00:00.000Z',
  last_submitted_at: '2026-11-23T10:00:00.000Z',
};
const column = (field: string) => mocks.columns.find((c) => c.field === field) as Column;

function setup() {
  const refetchRef = { current: vi.fn() as (() => void) | null };
  const onChanged = vi.fn();
  render(<VenueKitInterestsTable refetchRef={refetchRef} onChanged={onChanged} />);
  return { refetchRef, onChanged };
}

/** Opens the status select on `row` and picks `label`. */
function pickStatus(row: Row, label: string) {
  const { unmount } = render(<>{column('status').cellRenderer?.(row)}</>);
  fireEvent.mouseDown(screen.getByRole('combobox'));
  fireEvent.click(within(screen.getByRole('listbox')).getByText(label));
  return unmount;
}

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('VenueKitInterestsTable', () => {
  it('pages the server table, newest first, searchable', () => {
    setup();
    expect(mocks.tableProps).toMatchObject({
      tableId: 'venues-venue-kit-interests',
      fetchRows: 'fetch-rows',
      defaultSort: { field: 'created_at', dir: 'desc' },
      searchPlaceholder: 'Search name, email or mobile',
      emptyText: 'No venue has registered interest yet.',
    });
    expect((mocks.tableProps.getRowId as (r: Row) => string)(ROW)).toBe('i1');
  });

  it('shows the number with its dial code, the source and the dates in words', () => {
    setup();
    expect(column('phone_number').valueGetter?.(ROW)).toBe('+91 9876543210');
    expect(column('source').valueGetter?.(ROW)).toBe('Website');
    expect(column('source').valueGetter?.({ ...ROW, source: 'VENUES_PORTAL' })).toBe('Venues console');
    expect(column('status').valueGetter?.(ROW)).toBe('New');
    expect(column('status').options?.map((o) => o.value)).toEqual(['NEW', 'CONTACTED', 'CONVERTED', 'NOT_INTERESTED']);
    expect(column('created_at').valueGetter?.(ROW)).toBe('at 2026-11-22T10:00:00.000Z');
    expect(column('last_submitted_at').valueGetter?.(ROW)).toBe('at 2026-11-23T10:00:00.000Z');
  });

  it('marks a proved mobile, and an unproved one plainly', () => {
    setup();
    expect(column('phone_verified').valueGetter?.(ROW)).toBe('Yes');
    expect(column('phone_verified').valueGetter?.({ ...ROW, phone_verified: false })).toBe('No');
    const { unmount } = render(<>{column('phone_verified').cellRenderer?.(ROW)}</>);
    expect(screen.getByText('Yes')).toBeTruthy();
    unmount();
    render(<>{column('phone_verified').cellRenderer?.({ ...ROW, phone_verified: false })}</>);
    expect(screen.getByText('No')).toBeTruthy();
  });

  it('moves a venue to a new status, then refreshes the table and the counts', async () => {
    mocks.setStatus.mockResolvedValue({});
    const { refetchRef, onChanged } = setup();
    pickStatus(ROW, 'Contacted');
    await waitFor(() => expect(mocks.notifySuccess).toHaveBeenCalledWith('Status updated'));
    expect(mocks.setStatus).toHaveBeenCalledWith({ variables: { input: { id: 'i1', status: 'CONTACTED' } } });
    expect(refetchRef.current).toHaveBeenCalled();
    expect(onChanged).toHaveBeenCalled();
  });

  it('does nothing when the same status is picked again', () => {
    setup();
    pickStatus(ROW, 'New');
    expect(mocks.setStatus).not.toHaveBeenCalled();
  });

  it('says why a status change was refused and logs it', async () => {
    mocks.setStatus.mockRejectedValue(new Error('Access Denied'));
    const { onChanged } = setup();
    pickStatus(ROW, 'Converted');
    await waitFor(() => expect(mocks.notifyError).toHaveBeenCalledWith('Access Denied'));
    expect(mocks.warn).toHaveBeenCalled();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('survives a table that has not handed back its refetch yet', async () => {
    mocks.setStatus.mockResolvedValue({});
    const refetchRef = { current: null };
    const onChanged = vi.fn();
    render(<VenueKitInterestsTable refetchRef={refetchRef} onChanged={onChanged} />);
    pickStatus(ROW, 'Not interested');
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });
});
