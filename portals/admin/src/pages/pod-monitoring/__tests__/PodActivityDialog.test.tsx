import { describe, expect, it, vi, afterEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { renderWithProviders } from '../../../__tests__/testkit';
import PodActivityDialog from '../PodActivityDialog';
import { POD_AUDIT_LOGS, type PodAuditLog } from '../queries';

const onClose = vi.fn();

const entry = (over: Partial<PodAuditLog> = {}): PodAuditLog => ({
  id: 'log-1',
  pod_id: 'pod-1',
  pod_title: 'Sunday board games',
  club_id: null,
  actor_user_id: 'u1',
  actor_name: 'Asha Rao',
  source: 'HOST',
  action: 'CREATE',
  changes: [{ field: 'title', from: '', to: 'Sunday board games' }],
  note: 'Created via the host app',
  ai_risk: 'LOW',
  ai_summary: 'Looks routine.',
  ai_reviewed_at: null,
  created_at: '2026-03-04T10:15:00.000Z',
  ...over,
});

const logsMock = (entries: PodAuditLog[], podId = 'pod-1'): MockedResponse => ({
  request: { query: POD_AUDIT_LOGS, variables: { pod_doc_id: podId } },
  result: { data: { podAuditLogs: entries.map((e) => ({ __typename: 'PodAuditLog', ...e })) } },
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PodActivityDialog', () => {
  it('renders nothing and skips the query when there is no pod', () => {
    renderWithProviders(<PodActivityDialog pod={null} onClose={onClose} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows a spinner before the log resolves', () => {
    renderWithProviders(
      <PodActivityDialog pod={{ id: 'pod-1', pod_title: 'Sunday board games' }} onClose={onClose} />,
      { mocks: [logsMock([entry()])] },
    );
    expect(screen.getByText('Activity · Sunday board games')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows the GraphQL error message instead of the loading/empty states', async () => {
    const mock: MockedResponse = {
      request: { query: POD_AUDIT_LOGS, variables: { pod_doc_id: 'pod-1' } },
      result: { errors: [new GraphQLError('Could not load activity')] },
    };
    renderWithProviders(
      <PodActivityDialog pod={{ id: 'pod-1', pod_title: 'Sunday board games' }} onClose={onClose} />,
      { mocks: [mock] },
    );
    expect(await screen.findByText('Could not load activity')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('says there is no recorded activity once an empty log resolves', async () => {
    renderWithProviders(
      <PodActivityDialog pod={{ id: 'pod-1', pod_title: 'Sunday board games' }} onClose={onClose} />,
      { mocks: [logsMock([])] },
    );
    expect(await screen.findByText('No recorded activity for this pod yet.')).toBeInTheDocument();
  });

  it('renders every entry field: actor/source/risk chips, changes, note and AI summary', async () => {
    renderWithProviders(
      <PodActivityDialog pod={{ id: 'pod-1', pod_title: 'Sunday board games' }} onClose={onClose} />,
      { mocks: [logsMock([entry()])] },
    );
    expect(await screen.findByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('Host')).toBeInTheDocument();
    expect(screen.getByText('title: — → Sunday board games')).toBeInTheDocument();
    expect(screen.getByText('Created via the host app')).toBeInTheDocument();
    expect(screen.getByText('AI: Looks routine.')).toBeInTheDocument();
  });

  it('falls back to the source label when an entry has no actor name, and hides note/AI/changes when absent', async () => {
    renderWithProviders(
      <PodActivityDialog pod={{ id: 'pod-1', pod_title: 'Sunday board games' }} onClose={onClose} />,
      {
        mocks: [
          logsMock([
            entry({ id: 'log-2', actor_name: '', note: '', ai_summary: '', changes: [], source: 'SYSTEM' }),
          ]),
        ],
      },
    );
    expect(await screen.findAllByText('System')).not.toHaveLength(0);
    expect(screen.queryByText(/^AI:/)).not.toBeInTheDocument();
    expect(screen.queryByText('Created via the host app')).not.toBeInTheDocument();
  });

  it('closes via the Close button', async () => {
    renderWithProviders(
      <PodActivityDialog pod={{ id: 'pod-1', pod_title: 'Sunday board games' }} onClose={onClose} />,
      { mocks: [logsMock([])] },
    );
    await screen.findByText('No recorded activity for this pod yet.');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
