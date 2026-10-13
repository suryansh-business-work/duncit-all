import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import type { MockedResponse } from '@apollo/client/testing';
import { renderWithApollo } from '../helpers/renderWithApollo';
import {
  COMMUNICATION_LOGS,
  REQUEST_COMMUNICATION_TRANSCRIPT,
  type CommunicationLogItem,
} from '@/api/comms.gql';

const socket = vi.hoisted(() => ({ handler: null as null | ((payload: { entity_id?: string }) => void) }));
vi.mock('@/hooks/useCallSocket', () => ({
  useCallSocket: (handler: (payload: { entity_id?: string }) => void) => {
    socket.handler = handler;
  },
}));

import CommsLogsSection from '@/components/CommsLogsSection';

afterEach(() => {
  socket.handler = null;
});

const makeLog = (over: Partial<CommunicationLogItem> = {}): CommunicationLogItem => ({
  id: 'log-1',
  type: 'EMAIL',
  direction: 'OUTBOUND',
  entity_type: 'VENUE_LEAD',
  entity_id: 'v-1',
  provider_id: null,
  provider_name: null,
  contact_name: null,
  contact_value: 'asha@example.com',
  subject: 'Intro',
  status: 'SENT',
  error_message: null,
  duration_seconds: 0,
  recording_url: null,
  transcript: null,
  transcript_status: 'NONE',
  created_by: null,
  created_at: '2026-05-27T10:00:00.000Z',
  ...over,
});

const logsMock = (type: 'EMAIL' | 'CALL' | null, items: CommunicationLogItem[], total = items.length): MockedResponse => ({
  request: {
    query: COMMUNICATION_LOGS,
    variables: { filter: { entity_type: 'VENUE_LEAD', entity_id: 'v-1', type }, limit: 100, offset: 0 },
  },
  result: {
    data: {
      communicationLogs: {
        __typename: 'CommunicationLogPage',
        total,
        items: items.map((item) => ({ __typename: 'CommunicationLog', ...item })),
      },
    },
  },
});

const recordedCall = makeLog({
  id: 'call-1',
  type: 'CALL',
  subject: null,
  contact_value: '+919800000000',
  recording_url: 'https://rec.test/1.mp3',
});

const transcriptMock = (id: string): MockedResponse => ({
  request: { query: REQUEST_COMMUNICATION_TRANSCRIPT, variables: { id } },
  result: {
    data: {
      requestCommunicationTranscript: {
        __typename: 'CommunicationLog',
        id,
        transcript: null,
        transcript_status: 'PENDING',
        recording_url: 'https://rec.test/1.mp3',
      },
    },
  },
});

const mount = (mocks: MockedResponse[]) =>
  renderWithApollo(<CommsLogsSection entityType="VENUE_LEAD" entityId="v-1" />, mocks);

describe('CommsLogsSection', () => {
  it('shows a spinner, then the log rows with the counts per kind', async () => {
    mount([logsMock(null, [makeLog(), recordedCall])]);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(await screen.findByText('Intro')).toBeInTheDocument();
    expect(screen.getByText('Call to +919800000000')).toBeInTheDocument();
    expect(screen.getByTestId('crm-comms-filter-all')).toHaveTextContent('All (2)');
    expect(screen.getByTestId('crm-comms-filter-email')).toHaveTextContent('Email (1)');
    expect(screen.getByTestId('crm-comms-filter-call')).toHaveTextContent('Call (1)');
    expect(screen.getByTestId('crm-comms-filter-all')).toHaveAttribute('aria-pressed', 'true');
  });

  it('says nothing has happened yet when the log is empty', async () => {
    mount([logsMock(null, [])]);
    expect(await screen.findByText(/no communication yet/i)).toBeInTheDocument();
    expect(screen.getByTestId('crm-comms-filter-all')).toHaveTextContent('All (0)');
  });

  it('filters by kind through the server', async () => {
    mount([logsMock(null, [makeLog(), recordedCall]), logsMock('CALL', [recordedCall]), logsMock('EMAIL', [makeLog()])]);
    await screen.findByText('Intro');
    fireEvent.click(screen.getByTestId('crm-comms-filter-call'));
    await waitFor(() => expect(screen.queryByText('Intro')).not.toBeInTheDocument());
    expect(screen.getByText('Call to +919800000000')).toBeInTheDocument();
    expect(screen.getByTestId('crm-comms-filter-call')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByTestId('crm-comms-filter-email'));
    expect(await screen.findByText('Intro')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('crm-comms-filter-all'));
    expect(await screen.findByText('Call to +919800000000')).toBeInTheDocument();
  });

  it('shows the API error', async () => {
    mount([
      {
        request: {
          query: COMMUNICATION_LOGS,
          variables: { filter: { entity_type: 'VENUE_LEAD', entity_id: 'v-1', type: null }, limit: 100, offset: 0 },
        },
        result: { errors: [new GraphQLError('Logs unavailable')] },
      },
    ]);
    expect(await screen.findByRole('alert')).toHaveTextContent('Logs unavailable');
  });

  it('requests a transcript then refreshes the log', async () => {
    mount([logsMock(null, [recordedCall]), transcriptMock('call-1'), logsMock(null, [{ ...recordedCall, transcript_status: 'PENDING' }])]);
    fireEvent.click(await screen.findByRole('button', { name: /get transcript/i }));
    expect(await screen.findByText('Transcript pending')).toBeInTheDocument();
  });

  it('shows a dismissible error when the transcript request fails', async () => {
    mount([
      logsMock(null, [recordedCall]),
      {
        request: { query: REQUEST_COMMUNICATION_TRANSCRIPT, variables: { id: 'call-1' } },
        result: { errors: [new GraphQLError('Servam is down')] },
      },
    ]);
    fireEvent.click(await screen.findByRole('button', { name: /get transcript/i }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Servam is down');
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('refreshes when a live call event for this lead arrives and ignores another lead', async () => {
    mount([logsMock(null, [makeLog()]), logsMock(null, [makeLog(), recordedCall])]);
    await screen.findByText('Intro');
    socket.handler?.({ entity_id: 'someone-else' });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByText('Call to +919800000000')).not.toBeInTheDocument();
    socket.handler?.({ entity_id: 'v-1' });
    expect(await screen.findByText('Call to +919800000000')).toBeInTheDocument();
  });

  it('refreshes for an event that names no lead', async () => {
    mount([logsMock(null, [makeLog()]), logsMock(null, [makeLog(), recordedCall])]);
    await screen.findByText('Intro');
    socket.handler?.({});
    expect(await screen.findByText('Call to +919800000000')).toBeInTheDocument();
  });
});
