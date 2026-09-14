import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { Route } from 'react-router';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { renderWithProviders } from '../../../../__tests__/testkit';
import { HOST_DETAIL, HOST_PODS_TABLE, type HostPodRow } from '../../queries';
import { hostDetailMock, hostPayload } from '../../__tests__/host-response';
import { LocationProbe } from '../../__tests__/table-stand-in';
import HostDetailsPage from '../HostDetailsPage';

// Each server table the page opens gets its own fetcher, keyed by the result
// field it reads, so a tab can be checked for asking the RIGHT table.
const tables = vi.hoisted(() => ({
  documents: new Map<string, unknown>(),
  fetchers: new Map<string, ReturnType<typeof vi.fn>>(),
}));
vi.mock('@duncit/table', async () => {
  const { TableStandIn } = await import('../../__tests__/table-stand-in');
  return {
    DuncitTable: TableStandIn,
    useApolloTableFetch: (_client: unknown, document: unknown, resultKey: string) => {
      tables.documents.set(resultKey, document);
      return tables.fetchers.get(resultKey);
    },
  };
});

const HOST_ID = '66f2b3c4d5e6f708192a3b4c';

const pods: HostPodRow[] = [
  {
    id: 'pod-4821',
    pod_title: 'Catan Night at Third Wave',
    pod_date_time: '2026-10-04T12:30:00.000Z',
    pod_mode: 'PHYSICAL',
    pod_type: 'PAID',
    no_of_spots: 12,
    seats_available: 3,
    is_active: true,
    venue_approval_status: 'APPROVED',
  },
  {
    id: 'pod-4822',
    pod_title: 'Online trivia league',
    pod_date_time: '',
    pod_mode: 'VIRTUAL',
    pod_type: 'FREE',
    no_of_spots: 20,
    seats_available: 20,
    is_active: true,
    venue_approval_status: 'NONE',
  },
];

function renderPage(mocks: MockedResponse[], path = `/hosts/${HOST_ID}`, backTo?: string) {
  return renderWithProviders(<></>, {
    mocks,
    initialEntries: [path],
    routes: (
      <>
        <Route path="/hosts/:hostId" element={<HostDetailsPage backTo={backTo} />} />
        <Route path="/hosts/record/view" element={<HostDetailsPage />} />
        <Route path="/hosts/:hostId/edit" element={<LocationProbe />} />
        <Route path="/pods/:podId" element={<LocationProbe />} />
      </>
    ),
  });
}

beforeEach(() => {
  tables.documents.clear();
  tables.fetchers.clear();
  tables.fetchers.set('podsTable', vi.fn().mockResolvedValue({ rows: pods, total: 2 }));
  tables.fetchers.set('entityChangeLogsTable', vi.fn().mockResolvedValue({ rows: [], total: 0 }));
});

describe('HostDetailsPage', () => {
  it('spins while the record loads, then heads the page with the host and opens on Overview', async () => {
    renderPage([hostDetailMock(HOST_ID, hostPayload())]);

    expect(screen.getByRole('status', { name: 'Loading…' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Ananya Iyer' })).toBeInTheDocument();
    expect(screen.getByText('Host')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/hosts');
    expect(screen.getByText('HOST-000317')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Who they are')).toBeInTheDocument();
    expect(screen.queryByText('Pods they run')).not.toBeInTheDocument();
  });

  it('Edit opens the editor beside the record it is on', async () => {
    renderPage([hostDetailMock(HOST_ID, hostPayload())]);

    fireEvent.click(await screen.findByRole('link', { name: 'Edit host' }));
    expect(screen.getByTestId('pathname')).toHaveTextContent(`/hosts/${HOST_ID}/edit`);
  });

  it('Pods lists the pods run by the host’s ACCOUNT, and a row opens that pod', async () => {
    renderPage([hostDetailMock(HOST_ID, hostPayload())]);
    fireEvent.click(await screen.findByRole('tab', { name: 'Pods' }));

    expect(screen.getByText('Pods they run')).toBeInTheDocument();
    expect(screen.queryByText('Who they are')).not.toBeInTheDocument();
    expect(tables.documents.get('podsTable')).toBe(HOST_PODS_TABLE);
    expect(screen.getByTestId('hosts-console-pods')).toHaveAttribute(
      'data-external-filters',
      JSON.stringify([{ field: 'host_user_id', op: 'eq', value: '66d1c2d3e4f5a6b7c8d9e0f1' }]),
    );
    expect(screen.getByTestId('col-no_of_spots')).toHaveTextContent('Booked');

    const [scheduled, unscheduled] = await screen.findAllByTestId('table-row');
    expect(within(scheduled).getByTestId('value-pod_title')).toHaveTextContent('Catan Night at Third Wave');
    expect(within(scheduled).getByTestId('value-pod_date_time')).not.toHaveTextContent('—');
    expect(within(scheduled).getByTestId('value-no_of_spots')).toHaveTextContent('9/12');
    expect(within(scheduled).getByTestId('cell-pod_mode')).toHaveTextContent('PHYSICAL');
    expect(within(scheduled).getByTestId('cell-venue_approval_status')).toHaveTextContent('APPROVED');
    expect(within(unscheduled).getByTestId('value-pod_date_time')).toHaveTextContent('—');
    expect(within(unscheduled).getByTestId('value-no_of_spots')).toHaveTextContent('0/20');

    fireEvent.click(screen.getByRole('button', { name: 'open pod-4822' }));
    expect(screen.getByTestId('pathname')).toHaveTextContent('/pods/pod-4822');
  });

  it('Change Logs shows this host’s own history', async () => {
    renderPage([hostDetailMock(HOST_ID, hostPayload())]);
    fireEvent.click(await screen.findByRole('tab', { name: 'Change Logs' }));

    expect(screen.getByText('Change logs')).toBeInTheDocument();
    expect(await screen.findByText('No changes recorded yet.')).toBeInTheDocument();
    expect(tables.fetchers.get('entityChangeLogsTable')).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Pods they run')).not.toBeInTheDocument();
  });

  it('names an unnamed host as such and goes Back to wherever the console mounted it', async () => {
    renderPage(
      [hostDetailMock(HOST_ID, hostPayload({ full_name: '' }))],
      `/hosts/${HOST_ID}`,
      '/clubs/66c0000000000000000000e1',
    );

    expect(await screen.findByRole('heading', { name: 'Unnamed host' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute(
      'href',
      '/clubs/66c0000000000000000000e1',
    );
  });

  it('warns when the server has no such host', async () => {
    renderPage([hostDetailMock(HOST_ID, null)]);
    expect(await screen.findByText('Host not found.')).toBeInTheDocument();
  });

  it('says not found without asking the server when the route carries no host id', () => {
    renderPage([], '/hosts/record/view');
    expect(screen.getByText('Host not found.')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the server’s error when the record cannot be read', async () => {
    renderPage([
      {
        request: { query: HOST_DETAIL, variables: { host_doc_id: HOST_ID } },
        result: { errors: [new GraphQLError('Host lookup failed')] },
      },
    ]);
    expect(await screen.findByRole('alert')).toHaveTextContent('Host lookup failed');
  });
});
