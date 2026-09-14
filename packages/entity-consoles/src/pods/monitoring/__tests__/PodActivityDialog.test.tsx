import { useState } from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { renderWithProviders } from '../../../../__tests__/testkit';
import PodActivityDialog from '../PodActivityDialog';
import type { PodAuditLog } from '@duncit/utils';
import { POD_AUDIT_LOGS } from '../queries';

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

const SUNDAY_POD = { id: 'pod-1', pod_title: 'Sunday board games' };

/** Starts with no pod selected, the way a page renders the dialog before a row is picked. */
function PodPicker() {
  const [pod, setPod] = useState<typeof SUNDAY_POD | null>(null);
  return (
    <>
      <button type="button" onClick={() => setPod(SUNDAY_POD)}>
        Open activity
      </button>
      <PodActivityDialog pod={pod} onClose={onClose} />
    </>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PodActivityDialog', () => {
  it('renders nothing and skips the query when there is no pod', async () => {
    // Apollo's mock link checks a response's variables the moment a request is
    // sent, so a query from the pod-less render would reach this matcher before
    // the pod's own query does.
    const matchVariables = vi.fn(() => true);
    const catchAll: MockedResponse = {
      request: { query: POD_AUDIT_LOGS, variables: matchVariables },
      result: { data: { podAuditLogs: [{ __typename: 'PodAuditLog', ...entry() }] } },
    };
    renderWithProviders(<PodPicker />, { mocks: [catchAll] });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open activity' }));

    expect(await screen.findByText('Asha Rao')).toBeInTheDocument();
    expect(matchVariables).toHaveBeenCalledTimes(1);
    expect(matchVariables).toHaveBeenCalledWith({ pod_doc_id: 'pod-1' });
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
    const changes = [
      { field: 'title', from: '', to: 'Sunday board games' },
      { field: 'venue', from: 'Third Wave Coffee, Indiranagar', to: '' },
    ];
    renderWithProviders(
      <PodActivityDialog pod={{ id: 'pod-1', pod_title: 'Sunday board games' }} onClose={onClose} />,
      { mocks: [logsMock([entry({ changes })])] },
    );
    expect(await screen.findByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('Host')).toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('LOW')).toBeInTheDocument();
    expect(screen.getByText('title: — → Sunday board games')).toBeInTheDocument();
    expect(screen.getByText('venue: Third Wave Coffee, Indiranagar → —')).toBeInTheDocument();
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
    // Both the actor line (fallback) and the source chip read "System".
    expect(await screen.findAllByText('System')).toHaveLength(2);
    expect(screen.queryByText(/→/)).not.toBeInTheDocument();
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
