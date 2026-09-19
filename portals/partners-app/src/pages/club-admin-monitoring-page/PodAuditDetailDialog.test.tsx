import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { formatDateTime } from '@duncit/app-settings';
import type { PodAuditLog } from '@duncit/utils';
import PodAuditDetailDialog from './PodAuditDetailDialog';
import { renderWithProviders } from '../../__tests__/render';

afterEach(cleanup);

const log = (over: Partial<PodAuditLog> = {}): PodAuditLog => ({
  id: 'log-1',
  pod_id: 'DUN-POD-4821',
  pod_title: 'Sunrise Tennis Doubles',
  club_id: 'club-1',
  actor_user_id: 'user-1',
  actor_name: 'Asha Rao',
  source: 'CLUB_ADMIN',
  action: 'UPDATE',
  changes: [
    { field: 'pod_amount', from: '399', to: '499' },
    { field: 'pod_info', from: '', to: '' },
  ],
  note: 'Court fee went up',
  ai_risk: 'HIGH',
  ai_summary: 'Price raised after bookings opened',
  ai_reviewed_at: '2026-09-12T08:20:00.000Z',
  created_at: '2026-09-12T08:15:00.000Z',
  ...over,
});

const mount = (entry: PodAuditLog | null, onClose = vi.fn()) =>
  renderWithProviders(<PodAuditDetailDialog log={entry} onClose={onClose} />);

describe('PodAuditDetailDialog', () => {
  it('is closed while no entry is selected', () => {
    mount(null);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the action, verdict, actor and a before/after line per tracked field', () => {
    mount(log());

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Edited — Sunrise Tennis Doubles')).toBeTruthy();
    expect(within(dialog).getByText('AI risk: HIGH')).toBeTruthy();
    expect(within(dialog).getByText('Club Admin')).toBeTruthy();
    expect(
      within(dialog).getByText(`${formatDateTime('2026-09-12T08:15:00.000Z')} · Asha Rao`),
    ).toBeTruthy();
    expect(within(dialog).getByText('Price raised after bookings opened')).toBeTruthy();
    expect(within(dialog).getByText('Court fee went up')).toBeTruthy();
    expect(within(dialog).getByText('Changes (2)')).toBeTruthy();

    expect(within(dialog).getByText('pod_amount')).toBeTruthy();
    expect(within(dialog).getByText('− 399')).toBeTruthy();
    expect(within(dialog).getByText('+ 499')).toBeTruthy();
    // A blank side of the diff is named, not left empty.
    expect(within(dialog).getByText('− (empty)')).toBeTruthy();
    expect(within(dialog).getByText('+ (empty)')).toBeTruthy();
    expect(within(dialog).queryByText('No tracked field changed for this action.')).toBeNull();
  });

  it('falls back to the pod id, an unknown actor and a no-changes line', () => {
    mount(
      log({
        pod_title: '',
        actor_name: '',
        action: 'DELETE',
        ai_risk: 'PENDING',
        ai_summary: '',
        note: '',
        changes: [],
      }),
    );

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Deleted — DUN-POD-4821')).toBeTruthy();
    expect(
      within(dialog).getByText(`${formatDateTime('2026-09-12T08:15:00.000Z')} · Unknown actor`),
    ).toBeTruthy();
    expect(within(dialog).getByText('Changes (0)')).toBeTruthy();
    expect(within(dialog).getByText('No tracked field changed for this action.')).toBeTruthy();
    expect(within(dialog).queryByText('Note:')).toBeNull();
  });

  it('closes from its Close button', () => {
    const onClose = vi.fn();
    mount(log(), onClose);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
