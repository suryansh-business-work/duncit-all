import { describe, expect, it, vi } from 'vitest';
import { Route } from 'react-router-dom';
import { type MockedResponse } from '@apollo/client/testing';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import TicketDetailPage from '../../src/pages/tickets/TicketDetailPage';
import { renderWithProviders } from '../testkit';
import {
  baseTicketMessages,
  emailTicketTranscriptMock,
  makeTicket,
  makeTicketActor,
  makeTicketMessage,
  markTicketReadMock,
  reopenTicketMock,
  replyToTicketMock,
  resolveTicketMock,
  ticketMock,
  ticketTranscriptMock,
  updatePriorityMock,
  updateStatusMock,
} from '../mocks/ticket.mock';

const sockMock = vi.hoisted(() => ({ events: {} as Record<string, (p: { id?: string }) => void> }));
vi.mock('../../src/lib/useSupportSocket', () => ({
  useSupportSocket: (events: Record<string, (p: { id?: string }) => void>) => {
    sockMock.events = events;
    return { current: null };
  },
}));

vi.mock('react-quill', () => ({
  default: ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <textarea data-testid="quill" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const ID = 't1';

const agentReply = () =>
  makeTicketMessage({
    id: 'm3',
    author_id: 'a1',
    author_role: 'AGENT',
    author_name: 'Agent',
    body_text: 'Try again now',
    created_at: new Date().toISOString(),
  });

// The page marks the thread read on open; append a default so that fire-and-
// forget mutation always resolves. A spec asserting on the Seen tick queues its
// own `markTicketReadMock` (matched first) that preserves `user_last_read_at`.
const renderAt = (mocks: MockedResponse[]) =>
  renderWithProviders(<></>, {
    mocks: [...mocks, markTicketReadMock()],
    initialEntries: [`/tickets/${ID}`],
    routes: (
      <>
        <Route path="/tickets/:id" element={<TicketDetailPage />} />
        <Route path="/tickets" element={<div>TICKET LIST</div>} />
      </>
    ),
  });

describe('TicketDetailPage', () => {
  it('shows a not-found message and navigates back from the fallback header', async () => {
    renderAt([ticketMock(null)]);
    await waitFor(() => expect(screen.getByText(/could not be found/i)).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Back'));
    expect(screen.getByText('TICKET LIST')).toBeInTheDocument();
  });

  it('flips the agent bubble ticks to Seen once the user has read the thread', async () => {
    const readTime = new Date(Date.now() + 60_000).toISOString();
    renderAt([
      ticketMock(makeTicket({ user_last_read_at: readTime })),
      markTicketReadMock({ user_last_read_at: readTime }),
    ]);
    await waitFor(() => expect(screen.getByText('My card fails')).toBeInTheDocument());
    // The agent's own message carries the blue double-tick (Seen) icon.
    expect(screen.getByText('Looking into it')).toBeInTheDocument();
    expect(document.querySelector('[data-testid="DoneAllIcon"]')).toBeInTheDocument();
  });

  it('renders the thread incl. a SYSTEM timeline line', async () => {
    const t = makeTicket({
      messages: [
        ...baseTicketMessages(),
        makeTicketMessage({
          id: 'm3',
          author_id: 'sys',
          author_role: 'SYSTEM',
          author_name: '',
          body_text: 'Ticket marked resolved by Agent.',
          created_at: new Date().toISOString(),
        }),
      ],
    });
    // The second ticket answers the refetch that a matching-id live update fires.
    renderAt([ticketMock(t), ticketMock(t)]);
    await waitFor(() => expect(screen.getByText('My card fails')).toBeInTheDocument());
    expect(screen.getByText('Looking into it')).toBeInTheDocument();
    expect(screen.getByText(/marked resolved by Agent/i)).toBeInTheDocument();
    sockMock.events.onTicketUpdate({ id: ID });
    sockMock.events.onTicketUpdate({ id: 'other' });
    await waitFor(() => expect(screen.getByText('My card fails')).toBeInTheDocument());
  });

  it('sends a reply', async () => {
    const withReply = makeTicket({ messages: [...baseTicketMessages(), agentReply()] });
    renderAt([ticketMock(makeTicket()), replyToTicketMock(), ticketMock(withReply), ticketMock(withReply)]);
    await waitFor(() => expect(screen.getByText('My card fails')).toBeInTheDocument());
    fireEvent.change(screen.getByTestId('quill'), { target: { value: '<p>Try again now</p>' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => expect(screen.getByText('Try again now')).toBeInTheDocument());
  });

  it('changes the ticket status', async () => {
    renderAt([
      ticketMock(makeTicket()),
      updateStatusMock({ status: 'PENDING' }),
      ticketMock(makeTicket({ status: 'PENDING' })),
    ]);
    await waitFor(() => expect(screen.getByText('Cannot pay')).toBeInTheDocument());
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Status' }));
    fireEvent.click(screen.getByRole('option', { name: 'PENDING' }));
    await waitFor(() => expect(screen.getAllByText('PENDING').length).toBeGreaterThan(0));
  });

  it('changes the ticket priority', async () => {
    renderAt([
      ticketMock(makeTicket()),
      updatePriorityMock({ priority: 'HIGH' }),
      ticketMock(makeTicket({ priority: 'HIGH' })),
    ]);
    await waitFor(() => expect(screen.getByText('Cannot pay')).toBeInTheDocument());
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Priority' }));
    fireEvent.click(screen.getByRole('option', { name: 'HIGH' }));
    await waitFor(() => expect(screen.getAllByText(/HIGH/).length).toBeGreaterThan(0));
  });

  it('surfaces a priority-change error in the snackbar', async () => {
    renderAt([ticketMock(makeTicket()), updatePriorityMock({ priority: 'LOW', error: 'Priority failed' })]);
    await waitFor(() => expect(screen.getByText('Cannot pay')).toBeInTheDocument());
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Priority' }));
    fireEvent.click(screen.getByRole('option', { name: 'LOW' }));
    await waitFor(() => expect(screen.getByText(/priority failed/i)).toBeInTheDocument());
  });

  it('resolves an open ticket via the confirm dialog', async () => {
    const resolved = makeTicket({ status: 'RESOLVED', resolved_at: new Date().toISOString() });
    renderAt([ticketMock(makeTicket()), resolveTicketMock(), ticketMock(resolved), ticketMock(resolved)]);
    await waitFor(() => expect(screen.getByText('Cannot pay')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Mark resolved'));
    await waitFor(() => expect(screen.getByText(/mark this ticket resolved\?/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /mark resolved/i }));
    await waitFor(() => expect(screen.getByLabelText('Re-open ticket')).toBeInTheDocument());
  });

  it('shows feedback + re-opens a resolved ticket and exports a transcript', async () => {
    const resolved = makeTicket({
      status: 'RESOLVED',
      resolved_at: new Date().toISOString(),
      rating: 4,
      feedback_comment: 'Quick fix',
    });
    renderAt([
      ticketMock(resolved),
      ticketTranscriptMock({ format: 'DOCX' }),
      emailTicketTranscriptMock({ email: 'z@e.com' }),
      reopenTicketMock(),
      ticketMock(makeTicket({ status: 'OPEN' })),
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
      ticketMock(makeTicket()),
      updateStatusMock({ status: 'PENDING', error: 'Status failed' }),
      resolveTicketMock({ error: 'Resolve failed' }),
      ticketTranscriptMock({ format: 'TXT', error: 'Export failed' }),
      emailTicketTranscriptMock({ email: 'x@e.com', error: 'Email failed' }),
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
    renderAt([ticketMock(makeTicket())]);
    await waitFor(() => expect(screen.getByText('Cannot pay')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Back'));
    expect(screen.getByText('TICKET LIST')).toBeInTheDocument();
  });

  it('hides the composer on a RESOLVED ticket and closes it via the confirm dialog (Item 17)', async () => {
    const resolved = makeTicket({ status: 'RESOLVED', resolved_at: new Date().toISOString() });
    const closed = makeTicket({ status: 'CLOSED' });
    renderAt([ticketMock(resolved), updateStatusMock({ status: 'CLOSED' }), ticketMock(closed), ticketMock(closed)]);
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
      ticketMock(makeTicket({ status: 'RESOLVED', resolved_at: new Date().toISOString() })),
      updateStatusMock({ status: 'CLOSED', error: 'Close failed' }),
    ]);
    await waitFor(() => expect(screen.getByText('Cannot pay')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /^close$/i }));
    fireEvent.click(await screen.findByRole('button', { name: /close ticket/i }));
    await waitFor(() => expect(screen.getByText(/close failed/i)).toBeInTheDocument());
  });

  it('shows a read-only notice (no composer, no Close button) on a CLOSED ticket', async () => {
    renderAt([ticketMock(makeTicket({ status: 'CLOSED' }))]);
    await waitFor(() => expect(screen.getByText(/closed and read-only/i)).toBeInTheDocument());
    expect(screen.queryByTestId('quill')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^close$/i })).not.toBeInTheDocument();
  });

  it('dismisses the close confirm dialog on cancel', async () => {
    renderAt([ticketMock(makeTicket({ status: 'RESOLVED', resolved_at: new Date().toISOString() }))]);
    await waitFor(() => expect(screen.getByText('Cannot pay')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /^close$/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: /close this support ticket\?/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: /close this support ticket\?/i })).not.toBeInTheDocument());
  });

  it('handles a nameless author and a user with no phone', async () => {
    const t = makeTicket({
      user: makeTicketActor({
        email: null,
        phone: null,
        city: null,
        state: null,
        country: null,
        joined_at: null,
        is_email_verified: false,
      }),
      messages: [
        makeTicketMessage({ id: 'm1', author_role: 'USER', author_name: '', body_text: 'Anonymous note', created_at: new Date().toISOString() }),
        makeTicketMessage({ id: 'm2', author_id: 'a1', author_role: 'AGENT', author_name: '', body_text: 'Agent note', created_at: new Date().toISOString() }),
      ],
    });
    renderAt([ticketMock(t)]);
    await waitFor(() => expect(screen.getByText('Anonymous note')).toBeInTheDocument());
    expect(screen.getAllByText('User').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Support').length).toBeGreaterThan(0);
  });
});
