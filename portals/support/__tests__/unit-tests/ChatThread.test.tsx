import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import ChatThread from '../../src/pages/live-chat/LiveChatPage/ChatThread';
import TicketThread from '../../src/pages/tickets/TicketDetailPage/TicketThread';
import type { SupportChatSession, SupportChatMessage } from '../../src/graphql/supportChat';
import type { Ticket } from '../../src/graphql/tickets';
import { publicAppSettingsMock } from './testkit';

const withProvider = (ui: React.ReactElement) =>
  render(<MockedProvider mocks={[publicAppSettingsMock()]} addTypename={false}>{ui}</MockedProvider>);

const session = (over: Partial<SupportChatSession> = {}): SupportChatSession => ({
  id: 's', ticket_no: 'CH-S', status: 'OPEN', last_message_at: '', last_message_preview: '',
  unread_for_agent: 0, agent_id: null, user_last_read_at: null, rating: null,
  feedback_comment: null, feedback_at: null, resolved_at: null,
  user: { id: 'u', name: 'Riya', phone: null, avatar_url: null }, ...over,
});

const cmsg = (id: string, role: SupportChatMessage['sender_role'], text: string): SupportChatMessage => ({
  id, session_id: 's', sender_id: 'x', sender_role: role, sender_name: 'X', sender_photo: null,
  text, attachments: [], is_ai: false, created_at: '2026-06-26T10:00:00Z',
});

/** Forces the next scroll read to report "not at bottom" so the FAB appears. */
function scrollAway(el: HTMLElement) {
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: 1000 });
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: 200 });
  Object.defineProperty(el, 'scrollTop', { configurable: true, value: 0 });
  fireEvent.scroll(el);
}

describe('ChatThread', () => {
  it('shows the jump-to-latest FAB after scrolling up, hides it at the bottom', async () => {
    withProvider(
      <ChatThread session={session()} messages={[cmsg('m1', 'USER', 'Hi')]} typingLabel="Riya is typing…" />,
    );
    await waitFor(() => expect(screen.getByText('Hi')).toBeInTheDocument());
    expect(screen.getByText('Riya is typing…')).toBeInTheDocument();

    const scroller = screen.getByTestId('chat-scroll');
    scrollAway(scroller);
    const fab = await screen.findByLabelText('Jump to latest');
    fireEvent.click(fab);

    // Returning to the bottom hides the FAB.
    Object.defineProperty(scroller, 'scrollTop', { configurable: true, value: 800 });
    fireEvent.scroll(scroller);
    await waitFor(() => expect(screen.queryByLabelText('Jump to latest')).not.toBeInTheDocument());
  });

  it('renders the resolved banner + feedback for a closed session', async () => {
    withProvider(
      <ChatThread
        session={session({ status: 'CLOSED', rating: 3, feedback_comment: 'ok' })}
        messages={[cmsg('m1', 'AGENT', 'done')]}
        typingLabel={null}
      />,
    );
    await waitFor(() => expect(screen.getByText(/marked as resolved/i)).toBeInTheDocument());
    expect(screen.getByText(/Neutral/i)).toBeInTheDocument();
  });
});

const ticket = (over: Partial<Ticket> = {}): Ticket => ({
  id: 't', subject: 'S', category: 'GENERAL', status: 'OPEN', priority: 'LOW',
  assignee_id: null, assignee_name: null, last_message_at: '', message_count: 1,
  resolved_at: null, reopen_deadline: null, rating: null, feedback_comment: null, feedback_at: null,
  created_at: '', updated_at: '', user: { id: 'u', name: 'Riya', phone: null, avatar_url: null },
  messages: [
    { id: 'm1', author_id: 'u', author_role: 'USER', author_name: 'Riya', author_photo: null, body_html: '', body_text: 'help', attachments: [], created_at: '2026-06-26T10:00:00Z' },
  ],
  ...over,
});

describe('TicketThread', () => {
  it('shows the FAB on scroll and feedback when resolved', async () => {
    const { container } = withProvider(
      <TicketThread ticket={ticket({ status: 'RESOLVED', rating: 2, feedback_comment: 'meh' })} />,
    );
    await waitFor(() => expect(screen.getByText('help')).toBeInTheDocument());
    expect(within(container).getByText(/Dissatisfied/i)).toBeInTheDocument();

    const scroller = screen.getByTestId('ticket-scroll');
    scrollAway(scroller);
    expect(await screen.findByLabelText('Jump to latest')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Jump to latest'));
  });
});
