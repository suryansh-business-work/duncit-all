import { describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardPage from '../../src/pages/DashboardPage';
import { BOUNCER_SOS_ALERTS, BOUNCER_CALLBACK_REQUESTS } from '../../src/graphql/bouncer';
import { TICKETS } from '../../src/graphql/tickets';
import { SUPPORT_CHAT_SESSIONS } from '../../src/graphql/supportChat';
import { renderWithProviders } from './testkit';

const sockMock = vi.hoisted(() => ({ events: {} as Record<string, () => void> }));
vi.mock('../../src/lib/useSupportSocket', () => ({
  useSupportSocket: (events: Record<string, () => void>) => {
    sockMock.events = events;
    return { current: null };
  },
}));

const repeat = (mock: any, n: number) => Array.from({ length: n }, () => ({ ...mock }));

const sosMock = repeat(
  {
    request: { query: BOUNCER_SOS_ALERTS, variables: { status: 'ACTIVE' } },
    result: { data: { bouncerSosAlerts: [{ __ref: 1 }, { __ref: 2 }].map((_, i) => ({
      id: `s${i}`, status: 'ACTIVE', message: '', contact_phone: '', acknowledged_at: null,
      resolved_at: null, created_at: new Date().toISOString(), location: null,
      user: { id: 'u', name: 'U', phone: null, avatar_url: null }, host: null,
      pod: { id: 'p', title: 'T', venue_name: null, club_name: null, starts_at: null },
    })) } },
  },
  3
);
const cbMock = repeat(
  {
    request: { query: BOUNCER_CALLBACK_REQUESTS, variables: { status: 'PENDING' } },
    result: { data: { bouncerCallbackRequests: [{
      id: 'c0', status: 'PENDING', reason: '', contact_phone: '', contacted_at: null,
      created_at: new Date().toISOString(), user: { id: 'u', name: 'U', phone: null }, pod: null,
    }] } },
  },
  3
);
const ticketMock = repeat(
  {
    request: { query: TICKETS, variables: { status: 'OPEN' } },
    result: { data: { tickets: ['a', 'b', 'c'].map((id) => ({
      __typename: 'Ticket',
      id, subject: 'S', category: 'GENERAL', status: 'OPEN', priority: 'MEDIUM',
      assignee_id: null, assignee_name: null, last_message_at: new Date().toISOString(),
      message_count: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      user: { id: 'u', name: 'U', phone: null, avatar_url: null },
    })) } },
  },
  3
);
const chatMock = repeat(
  {
    request: { query: SUPPORT_CHAT_SESSIONS, variables: { status: 'OPEN' } },
    result: { data: { supportChatSessions: [] } },
  },
  3
);

describe('DashboardPage', () => {
  it('renders live counts and navigates from a stat card', async () => {
    renderWithProviders(<></>, {
      mocks: [...sosMock, ...cbMock, ...ticketMock, ...chatMock],
      initialEntries: ['/'],
      routes: (
        <>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/sos" element={<div>SOS PAGE</div>} />
        </>
      ),
    });
    await waitFor(() => expect(screen.getByText('Active SOS alerts')).toBeInTheDocument());
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();

    // Cover every live-refetch callback.
    sockMock.events.onSos();
    sockMock.events.onSosUpdate();
    sockMock.events.onCallback();
    sockMock.events.onCallbackUpdate();
    sockMock.events.onTicketNew();
    sockMock.events.onTicketUpdate();
    sockMock.events.onChatSessionNew();
    sockMock.events.onChatSessionUpdate();

    fireEvent.click(screen.getByText('Active SOS alerts'));
    await waitFor(() => expect(screen.getByText('SOS PAGE')).toBeInTheDocument());
  });
});
