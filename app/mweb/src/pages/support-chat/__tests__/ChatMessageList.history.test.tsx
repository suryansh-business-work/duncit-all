import '@testing-library/jest-dom/vitest';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ChatMessageList from '../SupportChatPage/ChatMessageList';
import type { SupportChatMessage } from '../queries';

const msg = (n: number): SupportChatMessage => ({
  id: `m${n}`,
  session_id: 's1',
  sender_id: 'u1',
  sender_role: 'USER',
  sender_name: 'Riya',
  sender_photo: null,
  text: `text ${n}`,
  attachments: [],
  is_ai: false,
  created_at: new Date(Date.UTC(2026, 9, 1, 0, n)).toISOString(),
});

function renderList(props: { canLoadOlder: boolean; loadOlder: () => Promise<void>; onScroll?: () => void }) {
  const scrollRef = createRef<HTMLDivElement>();
  render(
    <ChatMessageList
      loading={false}
      messages={[msg(1), msg(2)]}
      agentLastReadAt={null}
      timeZone="UTC"
      typingText={null}
      formatTime={() => '10:00'}
      onRetry={vi.fn()}
      scrollRef={scrollRef}
      onScroll={props.onScroll ?? vi.fn()}
      canLoadOlder={props.canLoadOlder}
      loadOlder={props.loadOlder}
    />,
  );
  const log = screen.getByTestId('support-chat-messages');
  Object.defineProperty(log, 'scrollTop', { configurable: true, writable: true, value: 600 });
  return log;
}

/** The reader drags the log from 300px up to the top: the second event is the upward one. */
function scrollUp(log: HTMLElement) {
  log.scrollTop = 300;
  fireEvent.scroll(log);
  log.scrollTop = 0;
  fireEvent.scroll(log);
}

describe('support ChatMessageList scroll-up history', () => {
  it('asks for the older page once on reaching the top, busy until it lands, and still reports the scroll', async () => {
    let land: () => void = () => undefined;
    const loadOlder = vi.fn(() => new Promise<void>((resolve) => (land = resolve)));
    const onScroll = vi.fn();
    const log = renderList({ canLoadOlder: true, loadOlder, onScroll });
    scrollUp(log);
    scrollUp(log);
    expect(loadOlder).toHaveBeenCalledTimes(1);
    expect(onScroll).toHaveBeenCalledTimes(4);
    expect(log).toHaveAttribute('aria-busy', 'true');
    land();
    await waitFor(() => expect(log).toHaveAttribute('aria-busy', 'false'));
  });

  it('shows no control and asks nothing at the thread’s start', () => {
    const loadOlder = vi.fn(() => Promise.resolve());
    const log = renderList({ canLoadOlder: false, loadOlder });
    scrollUp(log);
    expect(loadOlder).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Show earlier messages' })).not.toBeInTheDocument();
  });

  it('says so when the page fails and retries from Show earlier', async () => {
    const loadOlder = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined);
    const log = renderList({ canLoadOlder: true, loadOlder });
    scrollUp(log);
    expect(await screen.findByRole('alert')).toHaveTextContent('The chat could not load.');
    scrollUp(log);
    expect(loadOlder).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Show earlier messages' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(loadOlder).toHaveBeenCalledTimes(2);
  });
});
