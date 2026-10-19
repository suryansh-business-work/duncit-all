import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { ColorModeProvider } from '@duncit/shell';
import ChatThread from '../../src/pages/live-chat/LiveChatPage/ChatThread';
import TicketThread from '../../src/pages/tickets/TicketDetailPage/TicketThread';
import { renderWithProviders } from '../testkit';
import { brandingMock, publicAppSettingsMock } from '../mocks/common.mock';
import { chatMessage, chatPage, makeSupportChatSession } from '../mocks/supportChat.mock';
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

/** A chat whose whole history is on screen. */
const NO_HISTORY = { hasOlder: false, loadingOlder: false, onLoadOlder: () => undefined };

describe('ChatThread', () => {
  it('shows the jump-to-latest FAB after scrolling up, hides it at the bottom', async () => {
    withProvider(
      <ChatThread
        session={makeSupportChatSession()}
        messages={[chatMessage('m1', 's', 'USER', 'Hi')]}
        typingLabel="Riya is typing…"
        {...NO_HISTORY}
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
        {...NO_HISTORY}
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

describe('ChatThread — scroll-up history', () => {
  /** Real providers around a thread the test re-renders with new props. */
  const Providers = ({ children }: { children: ReactNode }) => (
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={[brandingMock(), publicAppSettingsMock()]}>
      <ColorModeProvider>{children}</ColorModeProvider>
    </MockedProvider>
  );

  /** Puts the agent `top` px down a list `height` tall, in a 400px window. */
  const place = (el: HTMLElement, top: number, height: number) => {
    Object.defineProperty(el, 'scrollHeight', { configurable: true, writable: true, value: height });
    Object.defineProperty(el, 'clientHeight', { configurable: true, value: 400 });
    Object.defineProperty(el, 'scrollTop', { configurable: true, writable: true, value: top });
  };

  const page = chatPage('s', 30);
  const older = chatPage('s', 5, 'o', 9);
  const base = (onLoadOlder = vi.fn()) => ({
    session: makeSupportChatSession(),
    messages: page,
    typingLabel: null,
    hasOlder: true,
    loadingOlder: false,
    onLoadOlder,
  });

  it('asks for the older page near the top and holds the agent on the same line when it lands', async () => {
    const props = base();
    const { rerender } = render(<ChatThread {...props} />, { wrapper: Providers });
    await screen.findByText('p line 30');
    const scroller = screen.getByTestId('chat-scroll');
    place(scroller, 50, 3000);

    fireEvent.scroll(scroller);
    expect(props.onLoadOlder).toHaveBeenCalledTimes(1);

    rerender(<ChatThread {...props} loadingOlder />);
    expect(scroller).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('progressbar', { name: 'Loading…' })).toBeInTheDocument();

    // The older page renders above: the list grows by 900px.
    Object.defineProperty(scroller, 'scrollHeight', { configurable: true, writable: true, value: 3900 });
    rerender(<ChatThread {...props} messages={[...older, ...page]} />);

    expect(scroller.scrollTop).toBe(950);
    expect(scroller).toHaveAttribute('aria-busy', 'false');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByText('o line 1')).toBeInTheDocument();
  });

  it('asks for nothing while the agent reads further down, or once the start is on screen', async () => {
    const props = base();
    const { rerender } = render(<ChatThread {...props} />, { wrapper: Providers });
    await screen.findByText('p line 30');
    const scroller = screen.getByTestId('chat-scroll');

    place(scroller, 121, 3000);
    fireEvent.scroll(scroller);
    rerender(<ChatThread {...props} hasOlder={false} />);
    place(scroller, 0, 3000);
    fireEvent.scroll(scroller);

    expect(props.onLoadOlder).not.toHaveBeenCalled();
  });

  it('follows the agent’s own reply down while scrolled up, but leaves them be for the user’s line', async () => {
    const props = base();
    const { rerender } = render(<ChatThread {...props} />, { wrapper: Providers });
    await screen.findByText('p line 30');
    const scroller = screen.getByTestId('chat-scroll');
    place(scroller, 500, 3000);
    fireEvent.scroll(scroller);
    const scrollTo = vi.spyOn(scroller, 'scrollTo');

    const userLine = chatMessage('u-new', 's', 'USER', 'Hello?', { created_at: '2026-06-26T11:00:00Z' });
    rerender(<ChatThread {...props} messages={[...page, userLine]} />);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Jump to latest')).toBeInTheDocument();

    const reply = chatMessage('a-new', 's', 'AGENT', 'On it', { created_at: '2026-06-26T11:01:00Z' });
    rerender(<ChatThread {...props} messages={[...page, userLine, reply]} />);
    expect(scrollTo).toHaveBeenCalledWith({ top: 3000, behavior: 'auto' });
  });

  it('does not chase an AI reply while the agent is scrolled up', async () => {
    const props = base();
    const { rerender } = render(<ChatThread {...props} />, { wrapper: Providers });
    await screen.findByText('p line 30');
    const scroller = screen.getByTestId('chat-scroll');
    place(scroller, 500, 3000);
    fireEvent.scroll(scroller);
    const scrollTo = vi.spyOn(scroller, 'scrollTo');

    const ai = chatMessage('ai-new', 's', 'AGENT', 'Suggested answer', {
      is_ai: true,
      created_at: '2026-06-26T11:00:00Z',
    });
    rerender(<ChatThread {...props} messages={[...page, ai]} />);

    expect(scrollTo).not.toHaveBeenCalled();
  });
});
