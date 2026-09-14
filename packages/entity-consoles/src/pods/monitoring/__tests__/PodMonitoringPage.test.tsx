import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithProviders } from '../../../../__tests__/testkit';
import PodMonitoringPage from '../PodMonitoringPage';
import { POD_AUDIT_LOGS_TABLE } from '../queries';

// Only the AG Grid view is replaced: the page's real `useApolloTableFetch`
// bridge runs against the mocked Apollo link, so the rows on screen are the
// ones the page's own query fetched.
vi.mock('@duncit/table', async () => ({
  ...(await vi.importActual<typeof import('@duncit/table')>('@duncit/table')),
  ...(await import('./row-click-table-mock')),
}));

const auditRow = {
  __typename: 'PodAuditLog',
  id: 'log-1',
  pod_id: 'pod-1',
  pod_title: 'Sunday board games',
  club_id: null,
  actor_user_id: 'u1',
  actor_name: 'Asha Rao',
  source: 'HOST',
  action: 'CREATE',
  changes: [{ __typename: 'PodAuditChange', field: 'title', from: '', to: 'Sunday board games' }],
  note: 'Created via the host app',
  ai_risk: 'LOW',
  ai_summary: 'Looks routine.',
  ai_reviewed_at: null,
  created_at: '2026-03-04T10:15:00.000Z',
};

/** What the table's first page (newest first) sends through the page's fetch. */
const firstPage = {
  query: { search: null, page: 1, page_size: 50, sort_by: 'created_at', sort_dir: 'desc', filters: [] },
};

const rowsResult = {
  data: { podAuditLogsTable: { __typename: 'PodAuditLogTablePage', total: 1, rows: [auditRow] } },
};

const tableMock = (): MockedResponse => ({
  request: { query: POD_AUDIT_LOGS_TABLE, variables: firstPage },
  result: rowsResult,
});

describe('PodMonitoringPage', () => {
  it('renders the title and subtitle, and lists the audit rows its query fetches', async () => {
    renderWithProviders(<PodMonitoringPage />, { mocks: [tableMock()] });
    expect(screen.getByText('Pod Monitoring (AI)')).toBeInTheDocument();
    expect(
      screen.getByText('Every pod edit, status change and critical action — risk-scored by AI for auditability.'),
    ).toBeInTheDocument();

    const row = await screen.findByTestId('table-row');
    expect(within(row).getByTestId('value-pod_title')).toHaveTextContent('Sunday board games');
    expect(within(row).getByTestId('value-source')).toHaveTextContent('Asha Rao · Host');
  });

  it('opens the audit detail dialog for the clicked row, and closes it back to nothing', async () => {
    renderWithProviders(<PodMonitoringPage />, { mocks: [tableMock()] });
    const row = await screen.findByTestId('table-row');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(row);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Created — Sunday board games')).toBeInTheDocument();
    expect(within(dialog).getByText('Created via the host app')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByText('Created — Sunday board games')).not.toBeInTheDocument();
  });
});
