import '../helpers/agGridEnv';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { MutableRefObject } from 'react';
import ServicesOfferedTable from '@/pages/data/services-offered/ServicesOfferedTable';
import type { CrmServiceOfferedRow } from '@/api/data.gql';

const service: CrmServiceOfferedRow = {
  id: 's1',
  title: 'Sound System',
  slug: 'sound-system',
  super_category_id: 'sc1',
  category_id: 'c1',
  sub_category_id: 'sub1',
  super_category_name: 'Events',
  category_name: 'Audio',
  sub_category_name: 'Speakers',
  applies_to_venue: true,
  applies_to_host: true,
  is_active: true,
  sort_order: 3,
  created_at: '2026-03-09T08:00:00.000Z',
};

function renderTable(rows: CrmServiceOfferedRow[]) {
  const fetchRows = vi.fn(async () => ({ rows, total: rows.length }));
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  const refetchRef: MutableRefObject<(() => void) | null> = { current: null };
  render(
    <ServicesOfferedTable
      fetchRows={fetchRows}
      refetchRef={refetchRef}
      toolbarActions={<button type="button">Add Service Offered</button>}
      onEdit={onEdit}
      onDelete={onDelete}
    />,
  );
  return { fetchRows, onEdit, onDelete };
}

const showHiddenColumn = async (headerName: string) => {
  fireEvent.click(screen.getByLabelText('Columns'));
  fireEvent.click(await screen.findByText(headerName));
  fireEvent.keyDown(document.body, { key: 'Escape' });
};

beforeEach(() => {
  window.localStorage.clear();
});

describe('ServicesOfferedTable', () => {
  it('renders the title with its Super → Category → Sub trail and the Active chip', async () => {
    renderTable([service]);

    expect(await screen.findByText('Sound System')).toBeTruthy();
    expect(screen.getByText('Events')).toBeTruthy();
    expect(screen.getByText('Audio')).toBeTruthy();
    expect(screen.getByText('Speakers')).toBeTruthy();
    expect(screen.getByText('Active')).toBeTruthy();
  });

  it('labels the Applies-to chip Both when the service targets venues and hosts', async () => {
    renderTable([service]);
    expect(await screen.findByText('Both')).toBeTruthy();
  });

  it('labels the Applies-to chip Venue when only venues are targeted', async () => {
    renderTable([{ ...service, applies_to_host: false }]);
    expect(await screen.findByText('Venue')).toBeTruthy();
    expect(screen.queryByText('Both')).toBeNull();
  });

  it('labels the Applies-to chip Host when only hosts are targeted', async () => {
    renderTable([{ ...service, applies_to_venue: false }]);
    expect(await screen.findByText('Host')).toBeTruthy();
    expect(screen.queryByText('Both')).toBeNull();
  });

  it('falls back to an em dash for the taxonomy names and the Applies-to chip', async () => {
    renderTable([
      {
        ...service,
        super_category_name: null,
        category_name: '   ',
        sub_category_name: '',
        applies_to_venue: false,
        applies_to_host: false,
        is_active: false,
      },
    ]);

    expect(await screen.findByText('Sound System')).toBeTruthy();
    // three taxonomy cells + the Applies-to chip all collapse to the em dash
    expect(screen.getAllByText('—')).toHaveLength(4);
    expect(screen.getByText('Inactive')).toBeTruthy();
  });

  it('renders Yes/No per flag in the hidden For Venue and For Host columns once shown', async () => {
    renderTable([
      { ...service, id: 's2', title: 'Venue only', applies_to_host: false },
      { ...service, id: 's3', title: 'Host only', applies_to_venue: false },
    ]);
    await screen.findByText('Venue only');

    await showHiddenColumn('For Venue');
    await showHiddenColumn('For Host');

    // one Yes + one No per flag column, across the two rows
    expect(await screen.findAllByText('Yes')).toHaveLength(2);
    expect(screen.getAllByText('No')).toHaveLength(2);
  });

  it('shows the sort order and the date-fns Created date in their hidden columns', async () => {
    renderTable([service]);
    await screen.findByText('Sound System');

    await showHiddenColumn('Sort');
    await showHiddenColumn('Created');

    expect(await screen.findByText('3')).toBeTruthy();
    expect(await screen.findByText('9 Mar 2026')).toBeTruthy();
  });

  it('names the row actions after the service and hands the row to each callback', async () => {
    const { onEdit, onDelete } = renderTable([service]);
    await screen.findByText('Sound System');

    fireEvent.click(screen.getByLabelText('Edit Sound System'));
    fireEvent.click(screen.getByLabelText('Delete Sound System'));

    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));
  });

  it('asks the server for the first unsorted page and wires the toolbar', async () => {
    const { fetchRows } = renderTable([service]);
    await screen.findByText('Sound System');

    expect(fetchRows).toHaveBeenCalledWith(
      expect.objectContaining({ search: '', page: 1, pageSize: 25, sortBy: null, filters: [] }),
    );
    expect(screen.getByPlaceholderText('Search title or slug')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add Service Offered' })).toBeTruthy();
  });

  it('shows the services empty state when the server returns nothing', async () => {
    renderTable([]);
    expect(await screen.findByText(/No services yet/i)).toBeTruthy();
  });
});
