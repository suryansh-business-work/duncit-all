import { describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import TicketDetailPage from '../../src/pages/tickets/TicketDetailPage';
import { REPLY_TO_TICKET, TICKET, UPDATE_TICKET_STATUS, type Ticket } from '../../src/graphql/tickets';
import { renderWithProviders } from './testkit';

const sockMock = vi.hoisted(() => ({ events: {} as Record<string, (p: any) => void> }));
vi.mock('../../src/lib/useSupportSocket', () => ({
  useSupportSocket: (events: Record<string, (p: any) => void>) => {
    sockMock.events = events;
    return { current: null };
  },
}));

vi.mock('react-quill', () => ({
  default: ({ value, onChange, placeholder }: any) => (
    <textarea data-testid="quill" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const ID = 't1';

const td = (overrides: Partial<Ticket> = {}): any => ({
  __typename: 'Ticket',
  id: ID,
  subject: 'Cannot pay',
  category: 'PAYMENT',
  status: 'OPEN',
  priority: 'MEDIUM',
  assignee_id: null,
  assignee_name: null,
  last_message_at: new Date().toISOString(),
  message_count: 2,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  user: { id: 'u1', name: 'Riya', phone: '+919800000000', avatar_url: null },
  messages: [
    {
      id: 'm1', author_id: 'u1', author_role: 'USER', author_name: 'Riya', author_photo: null,
      body_html: '<p>My card fails</p>', body_text: 'My card fails',
      attachments: ['https://img/a.png'], created_at: new Date().toISOString(),
    },
    {
      id: 'm2', author_id: 'a1', author_role: 'AGENT', author_name: 'Agent', author_photo: 'x',
      body_html: '', body_text: 'Looking into it', attachments: [], created_at: new Date().toISOString(),
    },
  ],
  ...overrides,
});

const ticketMock = (ticket: Ticket | null) => ({
  request: { query: TICKET, variables: { id: ID } },
  result: { data: { ticket } },
});

const renderAt = (mocks: any[]) =>
  renderWithProviders(<></>, {
    mocks,
    initialEntries: [`/tickets/${ID}`],
    routes: (
      <>
        <Route path="/tickets/:id" element={<TicketDetailPage />} />
        <Route path="/tickets" element={<div>TICKET LIST</div>} />
      </>
    ),
  });

describe('TicketDetailPage', () => {
  it('shows a not-found message', async () => {
    renderAt([ticketMock(null)]);
    await waitFor(() => expect(screen.getByText(/could not be found/i)).toBeInTheDocument());
  });

  it('renders the message thread (user html + agent text + attachments)', async () => {
    renderAt([ticketMock(td()), ticketMock(td())]);
    await waitFor(() => expect(screen.getByText('My card fails')).toBeInTheDocument());
    expect(screen.getByText('Looking into it')).toBeInTheDocument();
    // Live update for this ticket triggers a refetch; a different id is ignored.
    sockMock.events.onTicketUpdate({ id: ID });
    sockMock.events.onTicketUpdate({ id: 'other' });
  });

  it('sends a reply', async () => {
    renderAt([
      ticketMock(td()),
      { request: { query: REPLY_TO_TICKET }, variableMatcher: () => true, result: { data: { replyToTicket: { id: ID, status: 'PENDING', last_message_at: 'now', message_count: 3 } } } },
      ticketMock(td({ messages: [...td().messages!, { id: 'm3', author_id: 'a1', author_role: 'AGENT', author_name: 'Agent', author_photo: null, body_html: '', body_text: 'Try again now', attachments: [], created_at: new Date().toISOString() }] })),
    ]);
    await waitFor(() => expect(screen.getByText('My card fails')).toBeInTheDocument());
    fireEvent.change(screen.getByTestId('quill'), { target: { value: '<p>Try again now</p>' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => expect(screen.getByText('Try again now')).toBeInTheDocument());
  });

  it('changes the ticket status', async () => {
    renderAt([
      ticketMock(td()),
      { request: { query: UPDATE_TICKET_STATUS, variables: { ticket_id: ID, status: 'RESOLVED' } }, result: { data: { updateTicketStatus: { id: ID, status: 'RESOLVED' } } } },
      ticketMock(td({ status: 'RESOLVED' })),
    ]);
    await waitFor(() => expect(screen.getByText('Cannot pay')).toBeInTheDocument());
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', { name: 'RESOLVED' }));
    await waitFor(() => expect(screen.getAllByText('RESOLVED').length).toBeGreaterThan(0));
  });

  it('navigates back to the list', async () => {
    renderAt([ticketMock(td())]);
    await waitFor(() => expect(screen.getByText('Cannot pay')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Back'));
    expect(screen.getByText('TICKET LIST')).toBeInTheDocument();
  });

  it('handles a nameless author and a user with no phone', async () => {
    const t = td({
      user: { id: 'u1', name: 'Riya', phone: null, avatar_url: null },
      messages: [
        {
          id: 'm1', author_id: 'u1', author_role: 'USER', author_name: '', author_photo: null,
          body_html: '', body_text: 'Anonymous note', attachments: [], created_at: new Date().toISOString(),
        },
        {
          id: 'm2', author_id: 'a1', author_role: 'AGENT', author_name: '', author_photo: null,
          body_html: '', body_text: 'Agent note', attachments: [], created_at: new Date().toISOString(),
        },
      ],
    });
    renderAt([ticketMock(t), ticketMock(t)]);
    await waitFor(() => expect(screen.getByText('Anonymous note')).toBeInTheDocument());
    // Empty author_name falls back to the "User" / "Support" labels.
    expect(screen.getAllByText('User').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Support').length).toBeGreaterThan(0);
  });
});
