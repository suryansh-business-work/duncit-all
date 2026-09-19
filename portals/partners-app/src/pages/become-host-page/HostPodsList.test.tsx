import '../../../__tests__/helpers/agGridEnv';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { formatDateTime } from '@duncit/app-settings';
import { formatINR } from '@duncit/utils';
import HostPodsList from './HostPodsList';
import { renderWithProviders } from '../../__tests__/render';
import { scriptedLink, type SentOperation } from '../../__tests__/groupC-link';
import { partnerPodRow, podTablePage } from '../../__tests__/groupC-fixtures';

afterEach(cleanup);
beforeEach(() => {
  globalThis.localStorage.clear();
});

const completed = partnerPodRow({
  id: 'pod-done',
  pod_title: 'Rooftop Pottery',
  completed_at: '2026-09-01T10:00:00.000Z',
  pod_amount: 499,
  seats_taken: 3,
});
const unscheduled = partnerPodRow({
  id: 'pod-open',
  pod_title: 'Founders Breakfast',
  pod_date_time: null,
  pod_amount: null,
  seats_taken: null,
  pod_attendees: null,
});
const draft = partnerPodRow({ id: 'pod-draft', pod_title: 'Board Game Night', is_active: false });

const mount = (rows: readonly unknown[], sent: SentOperation[] = []) =>
  renderWithProviders(<HostPodsList />, {
    link: scriptedLink({ PartnerMyHostPodsTable: podTablePage('myHostPodsTable', rows) }, sent),
  });

/** The grid row a cell sits in, so each pod's assertions stay scoped to it. */
const rowOf = (cell: HTMLElement): HTMLElement => {
  const row = cell.closest('[role="row"]');
  if (!row) throw new Error('cell is not inside a grid row');
  return row as HTMLElement;
};

describe('HostPodsList', () => {
  it('heads the card and asks the host table for the newest pods first', async () => {
    const sent: SentOperation[] = [];
    mount([completed], sent);

    expect(screen.getByRole('heading', { name: 'Your hosted pods' })).toBeTruthy();
    expect(screen.getByText('Pods assigned to your host profile appear here.')).toBeTruthy();
    await screen.findByText('Rooftop Pottery');
    const request = sent.find((op) => op.name === 'PartnerMyHostPodsTable');
    expect(JSON.stringify(request?.variables)).toContain('pod_date_time');
  });

  it('shows date, seats, earnings and status for every hosted pod', async () => {
    mount([completed, unscheduled, draft]);

    const done = rowOf(await screen.findByText('Rooftop Pottery'));
    expect(within(done).getByText(formatDateTime('2026-10-04T07:30:00.000Z'))).toBeTruthy();
    // Priced per seat: three seats at ₹499.
    expect(within(done).getByText(formatINR(1497))).toBeTruthy();
    expect(within(done).getByText('Completed')).toBeTruthy();

    const open = rowOf(screen.getByText('Founders Breakfast'));
    expect(within(open).getByText('Not scheduled')).toBeTruthy();
    expect(within(open).getByText(formatINR(0))).toBeTruthy();
    expect(within(open).getByText('Active')).toBeTruthy();

    expect(within(rowOf(screen.getByText('Board Game Night'))).getByText('Inactive')).toBeTruthy();
  });

  it('reveals the per-seat price from the columns menu, zero when unpriced', async () => {
    mount([completed, unscheduled]);
    await screen.findByText('Rooftop Pottery');

    fireEvent.click(screen.getByRole('button', { name: 'Columns' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Amount' }));
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

    await waitFor(() =>
      expect(document.querySelectorAll('[role="gridcell"][col-id="pod_amount"]')).toHaveLength(2),
    );
    const amounts = [...document.querySelectorAll<HTMLElement>('[role="gridcell"][col-id="pod_amount"]')].map(
      (cell) => cell.textContent,
    );
    expect(amounts).toContain('499');
    expect(amounts).toContain('0');
  });

  it('says so when no pod is assigned to the host yet', async () => {
    mount([]);
    expect(await screen.findByText('No hosted pods yet.')).toBeTruthy();
  });
});
