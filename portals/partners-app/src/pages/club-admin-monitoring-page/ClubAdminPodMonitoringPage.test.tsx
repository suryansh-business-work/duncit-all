import '../../../__tests__/helpers/agGridEnv';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import ClubAdminPodMonitoringPage from './ClubAdminPodMonitoringPage';
import { renderWithProviders } from '../../__tests__/render';
import { scriptedLink } from '../../__tests__/groupC-link';

afterEach(cleanup);
beforeEach(() => {
  globalThis.localStorage.clear();
});

const auditRow = (over: Record<string, unknown> = {}) => ({
  __typename: 'PodAuditLog',
  id: 'log-1',
  pod_id: 'DUN-POD-4821',
  pod_title: 'Sunrise Tennis Doubles',
  club_id: 'club-1',
  actor_user_id: 'user-1',
  actor_name: 'Asha Rao',
  source: 'HOST',
  action: 'UPDATE',
  changes: [{ __typename: 'PodAuditChange', field: 'pod_amount', from: '399', to: '499' }],
  note: '',
  ai_risk: 'MEDIUM',
  ai_summary: 'Price raised after bookings opened',
  ai_reviewed_at: null,
  created_at: '2026-09-12T08:15:00.000Z',
  ...over,
});

const mount = (rows: readonly unknown[]) =>
  renderWithProviders(<ClubAdminPodMonitoringPage />, {
    link: scriptedLink({
      ClubAdminPodAuditLogsTable: {
        clubAdminPodAuditLogsTable: { __typename: 'PodAuditLogTablePage', total: rows.length, rows },
      },
    }),
  });

const rowOf = (cell: HTMLElement): HTMLElement => {
  const row = cell.closest('[role="row"]');
  if (!row) throw new Error('cell is not inside a grid row');
  return row as HTMLElement;
};

describe('ClubAdminPodMonitoringPage', () => {
  it('lists the audited actions with who made them and the AI verdict', async () => {
    mount([
      auditRow(),
      auditRow({
        id: 'log-2',
        pod_title: '',
        pod_id: 'DUN-POD-5100',
        actor_name: '',
        source: 'SYSTEM',
        action: 'DELETE',
        changes: [],
        ai_risk: 'PENDING',
        ai_summary: '',
      }),
    ]);

    expect(screen.getByRole('heading', { name: 'Pod Monitoring (AI)' })).toBeTruthy();
    const edited = rowOf(await screen.findByText('Sunrise Tennis Doubles'));
    expect(within(edited).getByText('Edited')).toBeTruthy();
    expect(within(edited).getByText('Asha Rao · Host')).toBeTruthy();
    expect(within(edited).getByText('MEDIUM')).toBeTruthy();
    expect(within(edited).getByText('Price raised after bookings opened')).toBeTruthy();

    // An entry with no title, actor or summary still reads as a row.
    const deleted = rowOf(screen.getByText('DUN-POD-5100'));
    expect(within(deleted).getByText('System')).toBeTruthy();
    expect(within(deleted).getByText('—')).toBeTruthy();
    expect(within(deleted).getByText('0')).toBeTruthy();
  });

  it('opens the clicked entry and closes it again', async () => {
    mount([auditRow()]);

    fireEvent.click(await screen.findByText('Sunrise Tennis Doubles'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Edited — Sunrise Tennis Doubles')).toBeTruthy();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('says so when nothing has been recorded yet', async () => {
    mount([]);
    expect(await screen.findByText('No pod activity recorded yet.')).toBeTruthy();
  });
});
