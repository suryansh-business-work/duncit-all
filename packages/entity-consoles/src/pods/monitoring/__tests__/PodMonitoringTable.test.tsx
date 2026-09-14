import { createRef } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { PodAuditLog } from '@duncit/utils';
import PodMonitoringTable from '../PodMonitoringTable';

// Real valueGetters/cellRenderers without AG Grid, plus the row click the
// shared table mock does not forward.
vi.mock('@duncit/table', () => import('./row-click-table-mock'));

const onRowClick = vi.fn();

const makeLog = (over: Partial<PodAuditLog> = {}): PodAuditLog => ({
  id: 'log-1',
  pod_id: 'pod-1',
  pod_title: 'Sunday board games',
  club_id: null,
  actor_user_id: 'u1',
  actor_name: 'Asha Rao',
  source: 'HOST',
  action: 'CREATE',
  changes: [{ field: 'title', from: '', to: 'Sunday board games' }],
  note: '',
  ai_risk: 'LOW',
  ai_summary: 'Looks routine.',
  ai_reviewed_at: null,
  created_at: '2026-03-04T10:15:00.000Z',
  ...over,
});

const renderTable = (rows: PodAuditLog[]) =>
  render(
    <PodMonitoringTable
      fetchRows={async () => ({ rows, total: rows.length })}
      refetchRef={createRef<(() => void) | null>()}
      onRowClick={onRowClick}
    />,
  );

describe('PodMonitoringTable', () => {
  beforeEach(() => {
    onRowClick.mockReset();
  });

  it('declares every audit column and the empty state', async () => {
    renderTable([]);
    expect(screen.getByTestId('col-created_at')).toHaveTextContent('When');
    expect(screen.getByTestId('col-pod_title')).toHaveTextContent('Pod');
    expect(screen.getByTestId('col-action')).toHaveTextContent('Action');
    expect(screen.getByTestId('col-source')).toHaveTextContent('By');
    expect(screen.getByTestId('col-changes')).toHaveTextContent('Changes');
    expect(screen.getByTestId('col-ai_risk')).toHaveTextContent('AI Risk');
    expect(screen.getByTestId('col-ai_summary')).toHaveTextContent('AI Summary');
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('No pod activity recorded yet.');
    expect(screen.getByTestId('duncit-table')).toHaveAttribute(
      'data-search-placeholder',
      'Search pod, actor or AI summary',
    );
  });

  it('formats the date, shows the pod title, and counts the changes', async () => {
    renderTable([makeLog()]);
    const row = await screen.findByTestId('table-row');
    const when = within(row).getByTestId('value-created_at').textContent ?? '';
    expect(when).not.toBe('—');
    expect(within(row).getByTestId('value-pod_title')).toHaveTextContent('Sunday board games');
    expect(within(row).getByTestId('value-changes')).toHaveTextContent('1');
  });

  it('falls back to the pod id when there is no pod title', async () => {
    renderTable([makeLog({ pod_title: '' })]);
    const row = await screen.findByTestId('table-row');
    expect(within(row).getByTestId('value-pod_title')).toHaveTextContent('pod-1');
  });

  it('renders the action chip and label', async () => {
    renderTable([makeLog({ action: 'DELETE' })]);
    const row = await screen.findByTestId('table-row');
    expect(within(row).getByTestId('value-action')).toHaveTextContent('Deleted');
    expect(within(row).getAllByText('Deleted').length).toBeGreaterThan(0);
  });

  it('joins the actor name with the source label when an actor is present', async () => {
    renderTable([makeLog({ actor_name: 'Asha Rao', source: 'HOST' })]);
    const row = await screen.findByTestId('table-row');
    expect(within(row).getByTestId('value-source')).toHaveTextContent('Asha Rao · Host');
  });

  it('shows only the source label when there is no actor name', async () => {
    renderTable([makeLog({ actor_name: '', source: 'SYSTEM' })]);
    const row = await screen.findByTestId('table-row');
    expect(within(row).getByTestId('value-source')).toHaveTextContent('System');
  });

  it('renders the AI risk chip and value', async () => {
    renderTable([makeLog({ ai_risk: 'HIGH' })]);
    const row = await screen.findByTestId('table-row');
    expect(within(row).getByTestId('value-ai_risk')).toHaveTextContent('HIGH');
    expect(within(row).getAllByText('HIGH').length).toBeGreaterThan(0);
  });

  it('renders the AI summary and dashes out a missing one', async () => {
    renderTable([makeLog({ ai_summary: '' })]);
    const row = await screen.findByTestId('table-row');
    expect(within(row).getByTestId('cell-ai_summary')).toHaveTextContent('—');
  });

  it('invokes onRowClick with the clicked row', async () => {
    renderTable([makeLog({ id: 'row-9' })]);
    const row = await screen.findByTestId('table-row');
    fireEvent.click(row);
    expect(onRowClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'row-9' }));
  });
});
