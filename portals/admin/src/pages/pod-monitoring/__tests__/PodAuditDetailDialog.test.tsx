import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PodAuditDetailDialog from '../PodAuditDetailDialog';
import type { PodAuditLog } from '@duncit/utils';

const onClose = vi.fn();

const makeLog = (over: Partial<PodAuditLog> = {}): PodAuditLog => ({
  id: 'log-1',
  pod_id: 'pod-1',
  pod_title: 'Sunday board games',
  club_id: 'club-1',
  actor_user_id: 'u1',
  actor_name: 'Asha Rao',
  source: 'HOST',
  action: 'UPDATE',
  changes: [{ field: 'title', from: 'Old title', to: 'New title' }],
  note: 'Flagged for review',
  ai_risk: 'MEDIUM',
  ai_summary: 'Wording changed materially.',
  ai_reviewed_at: '2026-03-04T10:15:00.000Z',
  created_at: '2026-03-04T10:15:00.000Z',
  ...over,
});

describe('PodAuditDetailDialog', () => {
  beforeEach(() => {
    onClose.mockReset();
  });

  it('renders nothing when there is no log to show', () => {
    render(<PodAuditDetailDialog log={null} onClose={onClose} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the action/pod title, actor, AI risk, AI summary, note and each change', () => {
    render(<PodAuditDetailDialog log={makeLog()} onClose={onClose} />);
    expect(screen.getByText('Edited — Sunday board games')).toBeInTheDocument();
    expect(screen.getAllByText('Edited').length).toBeGreaterThan(0);
    expect(screen.getByText('AI risk: MEDIUM')).toBeInTheDocument();
    expect(screen.getByText('Host')).toBeInTheDocument();
    expect(screen.getByText(/Asha Rao/)).toBeInTheDocument();
    expect(screen.getByText('Wording changed materially.')).toBeInTheDocument();
    expect(screen.getByText(/Flagged for review/)).toBeInTheDocument();
    expect(screen.getByText('Changes (1)')).toBeInTheDocument();
    expect(screen.getByText('title')).toBeInTheDocument();
    expect(screen.getByText('− Old title')).toBeInTheDocument();
    expect(screen.getByText('+ New title')).toBeInTheDocument();
    expect(screen.queryByText('No tracked field changed for this action.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('falls back to pod id, "Unknown actor", hides the AI/note blocks, dashes empty changes, and lists zero changes', () => {
    render(
      <PodAuditDetailDialog
        log={makeLog({
          pod_title: '',
          actor_name: '',
          ai_summary: '',
          note: '',
          changes: [{ field: 'description', from: '', to: '' }],
        })}
        onClose={onClose}
      />,
    );
    expect(screen.getByText('Edited — pod-1')).toBeInTheDocument();
    expect(screen.getByText(/Unknown actor/)).toBeInTheDocument();
    expect(screen.queryByText('Wording changed materially.')).not.toBeInTheDocument();
    expect(screen.queryByText(/Flagged for review/)).not.toBeInTheDocument();
    expect(screen.getByText('− (empty)')).toBeInTheDocument();
    expect(screen.getByText('+ (empty)')).toBeInTheDocument();
  });

  it('says no field changed when the change list is empty', () => {
    render(<PodAuditDetailDialog log={makeLog({ changes: [] })} onClose={onClose} />);
    expect(screen.getByText('Changes (0)')).toBeInTheDocument();
    expect(screen.getByText('No tracked field changed for this action.')).toBeInTheDocument();
  });
});
