import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import ChatThread from '../../src/pages/live-chat/LiveChatPage/ChatThread';
import TicketThread from '../../src/pages/tickets/TicketDetailPage/TicketThread';
import { renderWithProviders } from '../testkit';
import { publicAppSettingsMock } from '../mocks/common.mock';
import { chatMessage, makeSupportChatSession } from '../mocks/supportChat.mock';
import { makeTicket, makeTicketMessage } from '../mocks/ticket.mock';

const withProvider = (ui: React.ReactElement) =>
  renderWithProviders(ui, { mocks: [publicAppSettingsMock()] });

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
      <ChatThread
        session={makeSupportChatSession()}
        messages={[chatMessage('m1', 's', 'USER', 'Hi')]}
        typingLabel="Riya is typing…"
      />,
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
        session={makeSupportChatSession({ status: 'CLOSED', rating: 3, feedback_comment: 'ok' })}
        messages={[chatMessage('m1', 's', 'AGENT', 'done')]}
        typingLabel={null}
      />,
    );
    await waitFor(() => expect(screen.getByText(/marked as resolved/i)).toBeInTheDocument());
    expect(screen.getByText(/Neutral/i)).toBeInTheDocument();
  });
});

describe('TicketThread', () => {
  it('shows the FAB on scroll and feedback when resolved', async () => {
    const { container } = withProvider(
      <TicketThread
        ticket={makeTicket({
          status: 'RESOLVED',
          rating: 2,
          feedback_comment: 'meh',
          messages: [makeTicketMessage()],
        })}
      />,
    );
    await waitFor(() => expect(screen.getByText('help')).toBeInTheDocument());
    expect(within(container).getByText(/Dissatisfied/i)).toBeInTheDocument();

    const scroller = screen.getByTestId('ticket-scroll');
    scrollAway(scroller);
    expect(await screen.findByLabelText('Jump to latest')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Jump to latest'));
  });
});
