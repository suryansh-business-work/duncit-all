import { describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import TicketDetailPage from '../../src/pages/tickets/TicketDetailPage';
import {
  EMAIL_TICKET_TRANSCRIPT,
  REOPEN_TICKET,
  REPLY_TO_TICKET,
  RESOLVE_TICKET,
  TICKET,
  TICKET_TRANSCRIPT,
  UPDATE_TICKET_PRIORITY,
  UPDATE_TICKET_STATUS,
  type Ticket,
} from '../../src/graphql/tickets';
import { renderWithProviders, publicAppSettingsMock } from './testkit';

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

const baseMessages = () => [
  {
    id: 'm1', author_id: 'u1', author_role: 'USER', author_name: 'Riya', author_photo: null,
    body_html: '<p>My card fails</p>', body_text: 'My card fails',
    attachments: ['https://img/a.png'], created_at: new Date().toISOString(),
  },
  {
    id: 'm2', author_id: 'a1', author_role: 'AGENT', author_name: 'Agent', author_photo: 'x',
    body_html: '', body_text: 'Looking into it', attachments: [], created_at: new Date().toISOString(),
  },
];

const td = (overrides: Partial<Ticket> = {}): any => ({
  __typename: 'Ticket',
  id: ID,
  ticket_no: 'ST-ABC123',
  subject: 'Cannot pay',
  category: 'PAYMENT',
  status: 'OPEN',
  priority: 'MEDIUM',
  assignee_id: null,
  assignee_name: null,
  last_message_at: new Date().toISOString(),
  message_count: 2,
  resolved_at: null,
  reopen_deadline: null,
  rating: null,
  feedback_comment: null,
  feedback_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  user: {
    id: 'u1', name: 'Riya', email: 'riya@example.com', phone: '+919800000000', avatar_url: null,
    city: 'Mumbai', state: 'MH', country: 'India', joined_at: '2026-01-01T00:00:00.000Z',
    is_email_verified: true, is_phone_verified: false,
  },
  messages: baseMessages(),
  ...overrides,
});

const ticketMock = (ticket: Ticket | null) => ({
  request: { query: TICKET, variables: { id: ID } },
  result: { data: { ticket } },
});

const renderAt = (mocks: any[]) =>
  renderWithProviders(<></>, {
    mocks: [publicAppSettingsMock(), ...mocks],
    initialEntries: [`/tickets/${ID}`],
    routes: (
      <>
        <Route path="/tickets/:id" element={<TicketDetailPage />} />
        <Route path="/tickets" element={<div>TICKET LIST</div>} />
      </>
    ),
  });

describe('TicketDetailPage', () => {
  it('shows a not-found message (with a back button)', async () => {
    renderAt([ticketMock(null)]);
    await waitFor(() => expect(screen.getByText(/could not be found/i)).toBeInTheDocument());
    expect(screen.getByLabelText('Back')).toBeInTheDocument();
  });

  it('renders the thread incl. a SYSTEM timeline line', async () => {
    const t = td({
      messages: [
        ...baseMessages(),
        {
          id: 'm3', author_id: 'sys', author_role: 'SYSTEM', author_name: '', author_photo: null,
          body_html: '', body_text: 'Ticket marked resolved by Agent.', attachments: [], created_at: new Date().toISOString(),
        },
      ],
    });
    renderAt([ticketMock(t)]);
    await waitFor(() => expect(screen.getByText('My card fails')).toBeInTheDocument());
    expect(screen.getByText('Looking into it')).toBeInTheDocument();
    expect(screen.getByText(/marked resolved by Agent/i)).toBeInTheDocument();
    sockMock.events.onTicketUpdate({ id: ID });
    sockMock.events.onTicketUpdate({ id: 'other' });
  });

  it('sends a reply', async () => {
    renderAt([
      ticketMock(td()),
      { request: { query: REPLY_TO_TICKET }, variableMatcher: () => true, result: { data: { replyToTicket: { id: ID, status: 'PENDING', last_message_at: 'now', message_count: 3 } } } },
      ticketMock(td({ messages: [...baseMessages(), { id: 'm3', author_id: 'a1', author_role: 'AGENT', author_name: 'Agent', author_photo: null, body_html: '', body_text: 'Try again now', attachments: [], created_at: new Date().toISOString() }] })),
      ticketMock(td({ messages: [...baseMessages(), { id: 'm3', author_id: 'a1', author_role: 'AGENT', author_name: 'Agent', author_photo: null, body_html: '', body_text: 'Try again now', attachments: [], created_at: new Date().toISOString() }] })),
    ]);
    await waitFor(() => expect(screen.getByText('My card fails')).toBeInTheDocument());
    fireEvent.change(screen.getByTestId('quill'), { target: { value: '<p>Try again now</p>' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => expect(screen.getByText('Try again now')).toBeInTheDocument());
  });

  it('changes the ticket status', async () => {
    renderAt([
      ticketMock(td()),
      { request: { query: UPDATE_TICKET_STATUS, variables: { ticket_id: ID, status: 'PENDING' } }, result: { data: { updateTicketStatus: { id: ID, status: 'PENDING' } } } },
      ticketMock(td({ status: 'PENDING' })),
    ]);
    await waitFor(() => expect(screen.getByText('Cannot pay')).toBeInTheDocument());
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Status' }));
    fireEvent.click(screen.getByRole('option', { name: 'PENDING' }));
    await waitFor(() => expect(screen.getAllByText('PENDING').length).toBeGreaterThan(0));
  });

  it('changes the ticket priority', async () => {
    renderAt([
      ticketMock(td()),
      { request: { query: UPDATE_TICKET_PRIORITY, variables: { ticket_id: ID, priority: 'HIGH' } }, result: { data: { updateTicketPriority: { id: ID, priority: 'HIGH' } } } },
      ticketMock(td({ priority: 'HIGH' })),
    ]);
    await waitFor(() => expect(screen.getByText('Cannot pay')).toBeInTheDocument());
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Priority' }));
    fireEvent.click(screen.getByRole('option', { name: 'HIGH' }));
    await waitFor(() => expect(screen.getAllByText(/HIGH/).length).toBeGreaterThan(0));
  });

  it('surfaces a priority-change error in the snackbar', async () => {
    renderAt([
      ticketMock(td()),
      { request: { query: UPDATE_TICKET_PRIORITY, variables: { ticket_id: ID, priority: 'LOW' } }, error: new Error('Priority failed') },
    ]);
    await waitFor(() => expect(screen.getByText('Cannot pay')).toBeInTheDocument());
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Priority' }));
    fireEvent.click(screen.getByRole('option', { name: 'LOW' }));
    await waitFor(() => expect(screen.getByText(/priority failed/i)).toBeInTheDocument());
  });

  it('resolves an open ticket via the confirm dialog', async () => {
    renderAt([
      ticketMock(td()),
      { request: { query: RESOLVE_TICKET, variables: { ticket_id: ID } }, result: { data: { resolveTicket: { id: ID, status: 'RESOLVED', resolved_at: new Date().toISOString() } } } },
      ticketMock(td({ status: 'RESOLVED', resolved_at: new Date().toISOString() })),
      ticketMock(td({ status: 'RESOLVED', resolved_at: new Date().toISOString() })),
    ]);
    await waitFor(() => expect(screen.getByText('Cannot pay')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Mark resolved'));
    await waitFor(() => expect(screen.getByText(/mark this ticket resolved\?/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /mark resolved/i }));
    await waitFor(() => expect(screen.getByLabelText('Re-open ticket')).toBeInTheDocument());
  });

  it('shows feedback + re-opens a resolved ticket and exports a transcript', async () => {
    const resolved = td({
      status: 'RESOLVED',
      resolved_at: new Date().toISOString(),
      rating: 4,
      feedback_comment: 'Quick fix',
    });
    renderAt([
      ticketMock(resolved),
      { request: { query: TICKET_TRANSCRIPT, variables: { ticket_id: ID, format: 'DOCX' } }, result: { data: { ticketTranscript: { filename: 'support-ST-1.docx', text: 't', content_base64: 'aGk=' } } } },
      { request: { query: EMAIL_TICKET_TRANSCRIPT, variables: { ticket_id: ID, email: 'z@e.com', format: 'DOCX' } }, result: { data: { emailTicketTranscript: true } } },
      { request: { query: REOPEN_TICKET, variables: { ticket_id: ID, reason: null } }, result: { data: { reopenTicket: { id: ID, status: 'OPEN', resolved_at: null } } } },
      ticketMock(td({ status: 'OPEN' })),
    ]);
    await waitFor(() => expect(screen.getByText('Cannot pay')).toBeInTheDocument());
    // Feedback panel shows the emoji rating + comment.
    expect(screen.getByText(/Satisfied/i)).toBeInTheDocument();
    expect(screen.getByText(/Quick fix/i)).toBeInTheDocument();

    // Download .docx.
    fireEvent.click(screen.getByLabelText('Export transcript'));
    fireEvent.click(await screen.findByText('Download .docx'));
    await waitFor(() => expect(screen.queryByText('Download .docx')).not.toBeInTheDocument());

    // Email transcript.
    fireEvent.click(screen.getByLabelText('Export transcript'));
    fireEvent.click(await screen.findByText(/email transcript/i));
    fireEvent.change(screen.getByLabelText(/recipient email/i), { target: { value: 'z@e.com' } });
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));
    await waitFor(() => expect(screen.queryByLabelText(/recipient email/i)).not.toBeInTheDocument());

    // Re-open the ticket.
    fireEvent.click(screen.getByLabelText('Re-open ticket'));
  });

  it('surfaces status, resolve, transcript + email errors in a snackbar', async () => {
    renderAt([
      ticketMock(td()),
      { request: { query: UPDATE_TICKET_STATUS, variables: { ticket_id: ID, status: 'PENDING' } }, error: new Error('Status failed') },
      { request: { query: RESOLVE_TICKET, variables: { ticket_id: ID } }, error: new Error('Resolve failed') },
      { request: { query: TICKET_TRANSCRIPT, variables: { ticket_id: ID, format: 'TXT' } }, error: new Error('Export failed') },
      { request: { query: EMAIL_TICKET_TRANSCRIPT, variables: { ticket_id: ID, email: 'x@e.com', format: 'DOCX' } }, error: new Error('Email failed') },
    ]);
    await waitFor(() => expect(screen.getByText('Cannot pay')).toBeInTheDocument());

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Status' }));
    fireEvent.click(screen.getByRole('option', { name: 'PENDING' }));
    await waitFor(() => expect(screen.getByText(/status failed/i)).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText('Mark resolved'));
    fireEvent.click(await screen.findByRole('button', { name: /mark resolved/i }));
    await waitFor(() => expect(screen.getByText(/resolve failed/i)).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText('Export transcript'));
    fireEvent.click(await screen.findByText('Download .txt'));
    await waitFor(() => expect(screen.getByText(/export failed/i)).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText('Export transcript'));
    fireEvent.click(await screen.findByText(/email transcript/i));
    fireEvent.change(screen.getByLabelText(/recipient email/i), { target: { value: 'x@e.com' } });
    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));
    await waitFor(() => expect(screen.getByText(/email failed/i)).toBeInTheDocument());
  });

  it('navigates back to the list', async () => {
    renderAt([ticketMock(td())]);
    await waitFor(() => expect(screen.getByText('Cannot pay')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Back'));
    expect(screen.getByText('TICKET LIST')).toBeInTheDocument();
  });

  it('hides the composer on a RESOLVED ticket and closes it via the confirm dialog (Item 17)', async () => {
    const resolved = td({ status: 'RESOLVED', resolved_at: new Date().toISOString() });
    renderAt([
      ticketMock(resolved),
      { request: { query: UPDATE_TICKET_STATUS, variables: { ticket_id: ID, status: 'CLOSED' } }, result: { data: { updateTicketStatus: { id: ID, status: 'CLOSED' } } } },
      ticketMock(td({ status: 'CLOSED' })),
      ticketMock(td({ status: 'CLOSED' })),
    ]);
    await waitFor(() => expect(screen.getByText('Cannot pay')).toBeInTheDocument());

    // No reply composer is shown — the prominent Close button is instead.
    expect(screen.queryByTestId('quill')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^close$/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: /close this support ticket\?/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /close ticket/i }));

    // After closing it is permanently read-only — no composer, no Close button.
    await waitFor(() => expect(screen.getByText(/closed and read-only/i)).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /^close$/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('quill')).not.toBeInTheDocument();
  });

  it('surfaces a close error in the snackbar (Item 17)', async () => {
    renderAt([
      ticketMock(td({ status: 'RESOLVED', resolved_at: new Date().toISOString() })),
      { request: { query: UPDATE_TICKET_STATUS, variables: { ticket_id: ID, status: 'CLOSED' } }, error: new Error('Close failed') },
    ]);
    await waitFor(() => expect(screen.getByText('Cannot pay')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /^close$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /close ticket/i }));
    await waitFor(() => expect(screen.getByText(/close failed/i)).toBeInTheDocument());
  });

  it('shows a read-only notice (no composer, no Close button) on a CLOSED ticket', async () => {
    renderAt([ticketMock(td({ status: 'CLOSED' }))]);
    await waitFor(() => expect(screen.getByText(/closed and read-only/i)).toBeInTheDocument());
    expect(screen.queryByTestId('quill')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^close$/i })).not.toBeInTheDocument();
  });

  it('dismisses the close confirm dialog on cancel', async () => {
    renderAt([ticketMock(td({ status: 'RESOLVED', resolved_at: new Date().toISOString() }))]);
    await waitFor(() => expect(screen.getByText('Cannot pay')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /^close$/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: /close this support ticket\?/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: /close this support ticket\?/i })).not.toBeInTheDocument());
  });

  it('handles a nameless author and a user with no phone', async () => {
    const t = td({
      user: {
        id: 'u1', name: 'Riya', email: null, phone: null, avatar_url: null,
        city: null, state: null, country: null, joined_at: null,
        is_email_verified: false, is_phone_verified: false,
      },
      messages: [
        { id: 'm1', author_id: 'u1', author_role: 'USER', author_name: '', author_photo: null, body_html: '', body_text: 'Anonymous note', attachments: [], created_at: new Date().toISOString() },
        { id: 'm2', author_id: 'a1', author_role: 'AGENT', author_name: '', author_photo: null, body_html: '', body_text: 'Agent note', attachments: [], created_at: new Date().toISOString() },
      ],
    });
    renderAt([ticketMock(t)]);
    await waitFor(() => expect(screen.getByText('Anonymous note')).toBeInTheDocument());
    expect(screen.getAllByText('User').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Support').length).toBeGreaterThan(0);
  });
});
