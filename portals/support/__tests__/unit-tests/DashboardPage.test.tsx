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
    request: { query: BOUNCER_SOS_ALERTS, variables: { status: 'ACTIVE', page_size: 1 } },
    result: { data: { bouncerSosAlerts: { items: [], total: 2, page: 1, page_size: 1 } } },
  },
  3
);
const cbMock = repeat(
  {
    request: { query: BOUNCER_CALLBACK_REQUESTS, variables: { status: 'PENDING', page_size: 1 } },
    result: { data: { bouncerCallbackRequests: { items: [], total: 1, page: 1, page_size: 1 } } },
  },
  3
);
const ticketMock = repeat(
  {
    request: { query: TICKETS, variables: { status: 'OPEN', page_size: 1 } },
    result: { data: { tickets: { items: [], total: 3, page: 1, page_size: 1 } } },
  },
  3
);
const chatMock = repeat(
  {
    request: { query: SUPPORT_CHAT_SESSIONS, variables: { status: 'OPEN', page_size: 1 } },
    result: { data: { supportChatSessions: { items: [], total: 0, page: 1, page_size: 1 } } },
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
