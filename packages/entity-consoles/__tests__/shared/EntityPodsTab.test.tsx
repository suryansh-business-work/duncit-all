import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { Route, useLocation } from 'react-router';
import type { TableFilterValue } from '@duncit/table';
import { renderWithProviders } from '../testkit';
import { firstPageVariables } from './table-stub';
import EntityPodsTab from '../../src/shared/EntityPodsTab';
import EntityRecordsTab from '../../src/shared/EntityRecordsTab';
import {
  RECORD_PODS_TABLE,
  recordPodColumns,
  type RecordPodRow,
} from '../../src/shared/recordPods';

vi.mock('@duncit/table', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/table')>();
  const stub = await import('./table-stub');
  return { ...actual, DuncitTable: stub.DuncitTable };
});

/**
 * The related-records tab: a heading and a server table pinned to one filter,
 * whose rows open the record they list. A venue's pods and a club's pods are
 * this same tab with a different filter.
 */
const t = (key: string) => key;
const VENUE_ID = '66f1a2b3c4d5e6f708192a3b';

const pod = (over: Partial<RecordPodRow> = {}) => ({
  __typename: 'Pod',
  id: 'DUN-POD-4821',
  pod_title: 'Catan Night at Third Wave',
  pod_date_time: '2026-09-20T13:30:00.000Z',
  pod_mode: 'PHYSICAL',
  no_of_spots: 12,
  is_active: true,
  venue_approval_status: 'APPROVED',
  host_names: ['Ananya Iyer', 'Kabir Sethi'],
  ...over,
});

const podsMock = (filters: TableFilterValue[], rows: ReturnType<typeof pod>[]): MockedResponse => ({
  request: { query: RECORD_PODS_TABLE, variables: firstPageVariables('pod_date_time', filters) },
  result: { data: { podsTable: { __typename: 'PodTablePage', total: rows.length, rows } } },
});

function WhereAmI() {
  return <span data-testid="location">{useLocation().pathname}</span>;
}

describe('EntityPodsTab', () => {
  it("lists a venue's pods through the venue_id filter and opens the one clicked", async () => {
    const filter: TableFilterValue = { field: 'venue_id', op: 'eq', value: VENUE_ID };
    renderWithProviders(<></>, {
      initialEntries: [`/venues/${VENUE_ID}`],
      mocks: [
        podsMock([filter], [pod(), pod({ id: 'DUN-POD-4822', pod_date_time: '', host_names: [] })]),
      ],
      routes: (
        <>
          <Route
            path="/venues/:venueId"
            element={
              <EntityPodsTab<RecordPodRow>
                filterField="venue_id"
                filterValue={VENUE_ID}
                document={RECORD_PODS_TABLE}
                columns={recordPodColumns(t)}
                tableId="venues-console-pods"
                title="Pods at this venue"
                subtitle="Every pod booked into this venue."
                emptyText="No pods here yet."
              />
            }
          />
          <Route path="/pods/:podId" element={<WhereAmI />} />
        </>
      ),
    });

    expect(screen.getByText('Pods at this venue')).toBeInTheDocument();
    expect(screen.getByText('Every pod booked into this venue.')).toBeInTheDocument();

    const [scheduled, unscheduled] = await screen.findAllByTestId('table-row');
    expect(within(scheduled).getByTestId('value-pod_title')).toHaveTextContent('Catan Night at Third Wave');
    expect(within(scheduled).getByTestId('value-host_names')).toHaveTextContent('Ananya Iyer, Kabir Sethi');
    expect(within(scheduled).getByTestId('value-no_of_spots')).toHaveTextContent('12');
    expect(within(scheduled).getByTestId('value-venue_approval_status')).toHaveTextContent('APPROVED');
    expect(within(scheduled).getByTestId('value-pod_date_time').textContent).not.toBe('—');
    // A pod with no date or hosts yet reads as em-dashes, never as blanks.
    expect(within(unscheduled).getByTestId('value-pod_date_time')).toHaveTextContent('—');
    expect(within(unscheduled).getByTestId('value-host_names')).toHaveTextContent('—');

    fireEvent.click(scheduled);
    expect(await screen.findByTestId('location')).toHaveTextContent('/pods/DUN-POD-4821');
  });

  it('names every pods column by its copy key', () => {
    expect(recordPodColumns(t).map((column) => column.headerName)).toEqual([
      'admin.venueDetails.colPod',
      'admin.venueDetails.colWhen',
      'admin.venueDetails.colHosts',
      'admin.venueDetails.colSpots',
      'admin.venueDetails.colApproval',
    ]);
  });
});

describe('EntityRecordsTab', () => {
  const renderRecords = (filter: TableFilterValue, mocks: MockedResponse[] = []) =>
    renderWithProviders(
      <EntityRecordsTab<RecordPodRow>
        document={RECORD_PODS_TABLE}
        resultKey="podsTable"
        filter={filter}
        columns={recordPodColumns(t)}
        tableId="clubs-console-pods"
        title="Pods in this club"
        subtitle="Every pod this club runs."
        emptyText="No pods in this club yet."
        defaultSortField="pod_date_time"
        rowPath={(row) => `/pods/${row.id}`}
      />,
      { mocks },
    );

  it('answers an empty `in` filter with an empty page instead of asking for every row', async () => {
    // No mock is registered: a request going out would fail and show an error.
    renderRecords({ field: 'id', op: 'in', values: [] });
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('No pods in this club yet.');
    expect(screen.queryByTestId('table-error')).not.toBeInTheDocument();
  });

  it('answers a missing `in` value list the same way', async () => {
    renderRecords({ field: 'id', op: 'in' });
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('No pods in this club yet.');
  });

  it('asks the server when the `in` filter names records', async () => {
    const filter: TableFilterValue = { field: 'id', op: 'in', values: ['DUN-POD-4821'] };
    renderRecords(filter, [podsMock([filter], [pod()])]);
    const row = await screen.findByTestId('table-row');
    expect(within(row).getByTestId('value-pod_title')).toHaveTextContent('Catan Night at Third Wave');
  });
});
