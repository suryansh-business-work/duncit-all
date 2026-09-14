import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { Route } from 'react-router';
import { formatDateTime } from '@duncit/app-settings';
import { renderWithProviders } from '../../../../__tests__/testkit';
import { hostRecord } from '../../../../__tests__/fixtures';
import { HOSTS_TABLE, type HostRow } from '../../queries';
import { LocationProbe } from '../../__tests__/table-stand-in';
import HostsPage from '../HostsPage';

const table = vi.hoisted(() => ({
  fetchRows: vi.fn(),
  opened: [] as { document: unknown; resultKey: string }[],
}));
vi.mock('@duncit/table', async () => {
  const { TableStandIn } = await import('../../__tests__/table-stand-in');
  return {
    DuncitTable: TableStandIn,
    useApolloTableFetch: (_client: unknown, document: unknown, resultKey: string) => {
      table.opened.push({ document, resultKey });
      return table.fetchRows;
    },
  };
});

/** An application that has only just been started: no contact, no id yet. */
const draft: HostRow = {
  id: '66f2b3c4d5e6f708192a3b99',
  host_no: null,
  user_id: '66d1c2d3e4f5a6b7c8d9e099',
  full_name: 'Rohan Kapoor',
  email: '',
  phone: '',
  status: 'SUBMITTED',
  is_active: false,
  host_commission_pct: null,
  host_categories: [],
  submitted_at: '2026-09-01T08:00:00.000Z',
  approved_at: null,
  created_at: '2026-08-30T11:45:00.000Z',
};

function renderList() {
  return renderWithProviders(<></>, {
    initialEntries: ['/hosts'],
    routes: (
      <>
        <Route path="/hosts" element={<HostsPage />} />
        <Route path="/hosts/:hostId" element={<LocationProbe />} />
        <Route path="/hosts/new" element={<LocationProbe />} />
      </>
    ),
  });
}

beforeEach(() => {
  table.opened = [];
  table.fetchRows.mockReset();
  table.fetchRows.mockResolvedValue({ rows: [hostRecord, draft], total: 2 });
});

describe('HostsPage', () => {
  it('heads the list and reads the hosts table the server serves, newest first', async () => {
    renderList();

    expect(screen.getByRole('heading', { name: 'Hosts' })).toBeInTheDocument();
    expect(table.opened).toContainEqual({ document: HOSTS_TABLE, resultKey: 'hostsTable' });
    expect(table.fetchRows).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: 'created_at', sortDir: 'desc' }),
    );
    expect(screen.getByTestId('hosts-console-list')).toBeInTheDocument();
    expect(screen.getByTestId('duncit-table')).toHaveAttribute(
      'data-search-placeholder',
      'Search name, email, phone or host ID',
    );
    expect(await screen.findAllByTestId('table-row')).toHaveLength(2);
  });

  it('draws each row through the host columns', async () => {
    renderList();
    const [approved, submitted] = await screen.findAllByTestId('table-row');

    expect(within(approved).getByTestId('value-full_name')).toHaveTextContent('Ananya Iyer');
    expect(within(approved).getByTestId('value-email')).toHaveTextContent('ananya.iyer@example.com');
    expect(within(approved).getByTestId('value-status')).toHaveTextContent('APPROVED');
    expect(within(approved).getByTestId('cell-status')).toHaveTextContent('Approved');
    expect(within(approved).getByTestId('value-created_at')).toHaveTextContent(
      formatDateTime(hostRecord.created_at),
    );

    // Nothing to contact them on yet: both halves read as em-dashes, not blanks.
    const contact = within(submitted).getByTestId('cell-email');
    expect(within(contact).getAllByText('—')).toHaveLength(2);
    expect(within(submitted).getByTestId('cell-status')).toHaveTextContent('Awaiting review');
    expect(within(submitted).getByTestId('cell-is_active')).toHaveTextContent('Paused');
    expect(within(submitted).getByTestId('value-host_categories')).toHaveTextContent('—');
  });

  it('shows the empty copy when there are no hosts', async () => {
    table.fetchRows.mockResolvedValue({ rows: [], total: 0 });
    renderList();
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('No hosts yet.');
  });

  it('opens a host’s record from its row', async () => {
    renderList();
    fireEvent.click(await screen.findByRole('button', { name: `open ${draft.id}` }));
    expect(screen.getByTestId('pathname')).toHaveTextContent(`/hosts/${draft.id}`);
  });

  it('Add host opens an empty editor', () => {
    renderList();
    fireEvent.click(screen.getByRole('link', { name: 'Add host' }));
    expect(screen.getByTestId('pathname')).toHaveTextContent('/hosts/new');
  });
});
