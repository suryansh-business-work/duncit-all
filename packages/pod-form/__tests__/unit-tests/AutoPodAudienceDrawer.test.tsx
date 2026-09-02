import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AutoPodAudienceDrawer from '../../src/auto-pod/AutoPodAudienceDrawer';
import type { AutoPodAudience } from '../../src/auto-pod/audience-queries';

/**
 * The real grid is AG Grid, whose own package proves it. Here it is a plain
 * list that does what the drawer relies on: asks `fetchRows` for the page,
 * keys rows through `getRowId`, reads cells through `valueGetter` or the
 * field, and re-fetches when the search box changes.
 */
vi.mock('@duncit/table', async () => {
  const { useEffect, useState } = await import('react');
  const clientTableFetch = (rows: any[], searchOf: (row: any) => string) => async (q: any) => {
    const term = String(q.search).toLowerCase();
    const matched = rows.filter((row) => !term || searchOf(row).toLowerCase().includes(term));
    return { rows: matched, total: matched.length };
  };
  const DuncitTable = (props: any) => {
    const [rows, setRows] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    useEffect(() => {
      props
        .fetchRows({ search, page: 1, pageSize: 25, sortBy: null, sortDir: 'asc', filters: [] })
        .then((page: any) => setRows(page.rows));
    }, [search, props.fetchRows]);
    return (
      <div data-testid="table" data-table-id={props.tableId}>
        <input aria-label={props.searchPlaceholder} value={search} onChange={(e) => setSearch(e.target.value)} />
        {props.columns.map((column: any) => (
          <span key={column.field}>{column.headerName}</span>
        ))}
        {rows.length === 0 && <p>{props.emptyText}</p>}
        {rows.map((row: any) => (
          <div key={props.getRowId(row)} data-testid="row">
            {props.columns
              .map((column: any) => String(column.valueGetter ? column.valueGetter(row) : row[column.field]))
              .join(' | ')}
          </div>
        ))}
      </div>
    );
  };
  return { DuncitTable, clientTableFetch };
});

const audience: AutoPodAudience = {
  venue_count: 2,
  host_count: 1,
  club_admin_count: 1,
  venues: [
    { id: 'v1', venue_name: 'Play Arena', city: 'Bengaluru', locality: 'HSR', owner_name: 'Om Prakash' },
    { id: 'v2', venue_name: 'Smash Court', city: 'Mysuru', locality: 'Jayalakshmipuram', owner_name: 'Rita' },
  ],
  hosts: [
    { user_id: 'h1', full_name: 'Asha Rao', email: 'asha@example.com', phone: '9876543210' },
    // A host who never gave a phone: the cell reads blank, never "undefined".
    { user_id: 'h2', full_name: 'Bala', email: 'bala@example.com', phone: undefined as unknown as string },
  ],
  club_admins: [
    { user_id: 'a1', full_name: 'Neha Iyer', email: 'neha@example.com', club_names: ['Shuttlers', 'Smashers'] },
  ],
};

describe('AutoPodAudienceDrawer', () => {
  it('stays closed until a count is pressed', () => {
    render(<AutoPodAudienceDrawer role={null} audience={audience} onClose={vi.fn()} />);
    expect(screen.queryByTestId('auto-pod-audience-drawer')).not.toBeInTheDocument();
  });

  it('lists the venues with their city, locality and owner, searchable by any of them', async () => {
    const user = userEvent.setup();
    render(<AutoPodAudienceDrawer role="venues" audience={audience} onClose={vi.fn()} />);
    expect(screen.getByText('Venues in this category')).toBeInTheDocument();
    for (const header of ['Venue', 'City', 'Locality', 'Owner']) {
      expect(screen.getByText(header)).toBeInTheDocument();
    }
    expect(await screen.findAllByTestId('row')).toHaveLength(2);
    expect(screen.getByText('Play Arena | Bengaluru | HSR | Om Prakash')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Search…'), 'rita');
    await waitFor(() => expect(screen.getAllByTestId('row')).toHaveLength(1));
    expect(screen.getByText(/Smash Court/)).toBeInTheDocument();
  });

  it('lists the hosts with their contact details, searchable by any of them', async () => {
    const user = userEvent.setup();
    render(<AutoPodAudienceDrawer role="hosts" audience={audience} onClose={vi.fn()} />);
    expect(screen.getByText('Hosts in this category')).toBeInTheDocument();
    for (const header of ['Name', 'Email', 'Phone']) {
      expect(screen.getByText(header)).toBeInTheDocument();
    }
    expect(await screen.findByText('Asha Rao | asha@example.com | 9876543210')).toBeInTheDocument();
    expect(screen.getByText(/^Bala | bala@example.com/)).toBeInTheDocument();
    expect(screen.getByTestId('table')).toHaveAttribute('data-table-id', 'auto-pod-audience-hosts');
    await user.type(screen.getByLabelText('Search…'), '98765');
    await waitFor(() => expect(screen.getAllByTestId('row')).toHaveLength(1));
    expect(screen.getByText(/Asha Rao/)).toBeInTheDocument();
  });

  it('lists the club admins with every club of theirs joined, and closes on the X', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AutoPodAudienceDrawer role="club_admins" audience={audience} onClose={onClose} />);
    expect(screen.getByText('Club admins in this category')).toBeInTheDocument();
    expect(screen.getByText('Clubs')).toBeInTheDocument();
    expect(await screen.findByText('Neha Iyer | neha@example.com | Shuttlers, Smashers')).toBeInTheDocument();
    // A club name is part of what a row is searched against.
    await user.type(screen.getByLabelText('Search…'), 'smashers');
    await waitFor(() => expect(screen.getAllByTestId('row')).toHaveLength(1));
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('says so when a role has nobody in it', async () => {
    render(
      <AutoPodAudienceDrawer
        role="hosts"
        audience={{ ...audience, hosts: [], host_count: 0 }}
        onClose={vi.fn()}
      />,
    );
    expect(await screen.findByText('Nobody yet.')).toBeInTheDocument();
  });
});
