import type { MutableRefObject } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import type { TableFetch } from '@duncit/table';
import { renderWithProviders } from '../../../__tests__/testkit';
import PodMonitoringPage from '../PodMonitoringPage';
import type { PodAuditLog } from '../queries';

const makeLog = (over: Partial<PodAuditLog> = {}): PodAuditLog => ({
  id: 'log-1',
  pod_id: 'pod-1',
  pod_title: 'Sunday board games',
  club_id: null,
  actor_user_id: 'u1',
  actor_name: 'Asha Rao',
  source: 'HOST',
  action: 'CREATE',
  changes: [],
  note: '',
  ai_risk: 'LOW',
  ai_summary: '',
  ai_reviewed_at: null,
  created_at: '2026-03-04T10:15:00.000Z',
  ...over,
});

vi.mock('../PodMonitoringTable', () => ({
  default: ({
    fetchRows,
    onRowClick,
  }: {
    fetchRows: TableFetch<PodAuditLog>;
    refetchRef: MutableRefObject<(() => void) | null>;
    onRowClick: (row: PodAuditLog) => void;
  }) => (
    <div>
      <span data-testid="fetch-rows-type">{typeof fetchRows}</span>
      <button type="button" onClick={() => onRowClick(makeLog())}>
        row-click
      </button>
    </div>
  ),
}));

describe('PodMonitoringPage', () => {
  it('renders the title, subtitle and a real fetchRows function for the table', () => {
    renderWithProviders(<PodMonitoringPage />);
    expect(screen.getByText('Pod Monitoring (AI)')).toBeInTheDocument();
    expect(
      screen.getByText('Every pod edit, status change and critical action — risk-scored by AI for auditability.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('fetch-rows-type')).toHaveTextContent('function');
  });

  it('opens the audit detail dialog with the clicked row, and closes it back to nothing', () => {
    renderWithProviders(<PodMonitoringPage />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('row-click'));
    expect(screen.getByText('Created — Sunday board games')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText('Created — Sunday board games')).not.toBeInTheDocument();
  });
});
