import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { formatDateTime } from '@duncit/app-settings';
import PodActivityDialog from './PodActivityDialog';
import { renderWithProviders } from '../../__tests__/render';
import { STAY_PENDING, scriptedLink, type ScriptedAnswer, type SentOperation } from '../../__tests__/groupC-link';

afterEach(cleanup);

const pod = { id: 'pod-1', pod_title: 'Sunrise Tennis Doubles' };

const entry = (over: Record<string, unknown> = {}) => ({
  __typename: 'PodAuditLog',
  id: 'log-1',
  action: 'UPDATE',
  source: 'HOST',
  actor_name: 'Asha Rao',
  note: 'Moved to Sunday morning',
  changes: [
    { __typename: 'PodAuditChange', field: 'pod_title', from: 'Tennis Doubles', to: 'Sunrise Tennis Doubles' },
    { __typename: 'PodAuditChange', field: 'pod_info', from: '', to: '' },
  ],
  ai_risk: 'MEDIUM',
  ai_summary: 'Title and schedule changed',
  created_at: '2026-09-12T08:15:00.000Z',
  ...over,
});

const mount = (answer: ScriptedAnswer, sent: SentOperation[] = [], onClose = vi.fn()) =>
  renderWithProviders(<PodActivityDialog pod={pod} onClose={onClose} />, {
    link: scriptedLink({ ClubAdminPodAuditLogs: answer }, sent),
  });

describe('PodActivityDialog', () => {
  it('renders nothing and asks for nothing without a pod', () => {
    const sent: SentOperation[] = [];
    renderWithProviders(<PodActivityDialog pod={null} onClose={vi.fn()} />, {
      link: scriptedLink({}, sent),
    });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(sent).toHaveLength(0);
  });

  it('lists every audited action of the pod with its diff, note and AI verdict', async () => {
    const sent: SentOperation[] = [];
    mount(
      {
        clubAdminPodAuditLogs: [
          entry(),
          entry({
            id: 'log-2',
            action: 'DELETE',
            source: 'SYSTEM',
            actor_name: '',
            note: '',
            changes: [],
            ai_risk: 'PENDING',
            ai_summary: '',
          }),
        ],
      },
      sent,
    );

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Activity · Sunrise Tennis Doubles')).toBeTruthy();
    expect(await within(dialog).findByText('Edited')).toBeTruthy();
    expect(sent[0]?.variables).toEqual({ pod_doc_id: 'pod-1' });

    expect(within(dialog).getByText('Asha Rao')).toBeTruthy();
    expect(within(dialog).getByText('Host')).toBeTruthy();
    expect(within(dialog).getByText('MEDIUM')).toBeTruthy();
    expect(within(dialog).getByText('pod_title: Tennis Doubles → Sunrise Tennis Doubles')).toBeTruthy();
    // A field cleared on both sides still says so rather than printing blanks.
    expect(within(dialog).getByText('pod_info: — → —')).toBeTruthy();
    expect(within(dialog).getByText('Moved to Sunday morning')).toBeTruthy();
    expect(within(dialog).getByText('AI: Title and schedule changed')).toBeTruthy();
    expect(within(dialog).getAllByText(formatDateTime('2026-09-12T08:15:00.000Z'))).toHaveLength(2);

    // No actor name: the source stands in for it, next to its own chip.
    expect(within(dialog).getByText('Deleted')).toBeTruthy();
    expect(within(dialog).getAllByText('System')).toHaveLength(2);
    expect(within(dialog).getByText('PENDING')).toBeTruthy();
    expect(within(dialog).queryByText('No recorded activity for this pod yet.')).toBeNull();
  });

  it('spins while the trail loads', async () => {
    mount(STAY_PENDING);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('progressbar', { name: 'Loading…' })).toBeTruthy();
  });

  it('says so when the pod has no recorded activity', async () => {
    mount({ clubAdminPodAuditLogs: [] });
    expect(await screen.findByText('No recorded activity for this pod yet.')).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('shows the failure instead of the trail', async () => {
    mount(new Error('Not a club admin of this pod'));
    expect(await screen.findByText('Not a club admin of this pod')).toBeTruthy();
    expect(screen.queryByText('No recorded activity for this pod yet.')).toBeNull();
  });

  it('closes from its Close button', async () => {
    const onClose = vi.fn();
    mount({ clubAdminPodAuditLogs: [] }, [], onClose);
    fireEvent.click(await screen.findByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
