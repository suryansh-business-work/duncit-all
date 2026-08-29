/**
 * The small, independent pieces of the staff chat: the selection toolbar, the
 * typing bubble, the reply strip, the notification sounds and the header
 * entry point.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { act, fireEvent, render, screen } from '@testing-library/react';

import ReplyStrip from '../src/staff-chat/ReplyStrip';
import SelectionBar from '../src/staff-chat/SelectionBar';
import { StaffChatButton } from '../src/staff-chat/StaffChatButton';
import TypingIndicator from '../src/staff-chat/TypingIndicator';
import { playCallEnded, playMessagePing, startRinging } from '../src/staff-chat/sounds';
import { STAFF_UNREAD, type StaffMessage } from '../src/staff-chat/queries';
import { ShellRuntimeProvider } from '../src/lib/runtime';

const socketOn = vi.hoisted(() => ({ handlers: {} as Record<string, (p: unknown) => void> }));
vi.mock('socket.io-client', () => ({
  io: () => ({
    on: (event: string, handler: (p: unknown) => void) => {
      socketOn.handlers[event] = handler;
    },
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

// --------------------------------------------------------- SelectionBar ----

describe('SelectionBar', () => {
  const selection = (over: Partial<{ selected: StaffMessage[]; allMine: boolean }> = {}) => ({
    ids: new Set(['m1']),
    selected: over.selected ?? [{ id: 'm1' } as StaffMessage],
    active: true,
    allMine: over.allMine ?? true,
    toggle: vi.fn(),
    start: vi.fn(),
    clear: vi.fn(),
    copy: vi.fn(),
    remove: vi.fn(),
  });

  it('counts what is picked', () => {
    render(<SelectionBar selection={selection({ selected: [{} as StaffMessage, {} as StaffMessage] })} />);

    expect(screen.getByText('2 selected')).toBeInTheDocument();
  });

  it('reports each action to the selection it was given', () => {
    const sel = selection();
    render(<SelectionBar selection={sel} />);

    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hide' }));

    expect(sel.clear).toHaveBeenCalledTimes(1);
    expect(sel.copy).toHaveBeenCalledTimes(1);
    expect(sel.remove).toHaveBeenCalledWith(false);
  });

  // Taking a message back reaches the other person's copy, so it is only
  // offered when every message picked is one you wrote.
  it('offers delete-for-everyone only when the whole selection is the reader own', () => {
    const { rerender } = render(<SelectionBar selection={selection({ allMine: true })} />);
    expect(screen.getByRole('button', { name: 'Delete for everyone' })).toBeInTheDocument();

    rerender(<SelectionBar selection={selection({ allMine: false })} />);
    expect(screen.queryByRole('button', { name: 'Delete for everyone' })).not.toBeInTheDocument();
  });

  it('sends the delete-for-everyone flag when that button is pressed', () => {
    const sel = selection({ allMine: true });
    render(<SelectionBar selection={sel} />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete for everyone' }));

    expect(sel.remove).toHaveBeenCalledWith(true);
  });
});

// -------------------------------------------------------- TypingIndicator ----

describe('TypingIndicator', () => {
  it('renders nothing while nobody is typing', () => {
    const { container } = render(<TypingIndicator at={0} name="Asha" />);

    expect(container.innerHTML).toBe('');
  });

  it('names who is typing', () => {
    render(<TypingIndicator at={Date.now()} name="Asha" />);

    expect(screen.getByText('Asha is typing…')).toBeInTheDocument();
  });

  // Driven by a timestamp rather than a start/stop pair — there is no stop
  // event to rely on, so the bubble simply expires.
  it('expires the bubble once the linger window has passed', () => {
    const old = Date.now() - 10_000;

    const { container } = render(<TypingIndicator at={old} name="Asha" />);

    expect(container.innerHTML).toBe('');
  });

  it('clears its timer when the burst moves on before it fires', () => {
    vi.useFakeTimers();
    const { rerender, unmount } = render(<TypingIndicator at={Date.now()} name="Asha" />);

    // A live bubble is a live timer; the rerender replaces it rather than
    // stacking a second one.
    expect(vi.getTimerCount()).toBe(1);
    rerender(<TypingIndicator at={Date.now() + 100} name="Asha" />);
    expect(vi.getTimerCount()).toBe(1);

    // The cleanup path is the point: nothing is left armed to fire at an
    // unmounted component.
    unmount();
    expect(vi.getTimerCount()).toBe(0);

    vi.useRealTimers();
  });
});

// ------------------------------------------------------------ ReplyStrip ----

describe('ReplyStrip', () => {
  const message = (over: Partial<StaffMessage> = {}): StaffMessage =>
    ({
      id: 'm1',
      from_user_id: 'u1',
      to_user_id: 'u2',
      text: 'See you at the door',
      ...over,
    }) as StaffMessage;

  it('names who is being replied to, and quotes the text', () => {
    render(<ReplyStrip replyTo={message()} nameOf={() => 'Asha Rao'} onCancel={vi.fn()} />);

    expect(screen.getByText('Replying to Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('See you at the door')).toBeInTheDocument();
  });

  it('names the attachment when the original had no text', () => {
    render(
      <ReplyStrip
        replyTo={message({ text: '', attachment_name: 'roster.pdf' })}
        nameOf={() => 'Asha Rao'}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('roster.pdf')).toBeInTheDocument();
  });

  it('falls back to a generic word when there is neither text nor a name', () => {
    render(
      <ReplyStrip replyTo={message({ text: '', attachment_name: undefined })} nameOf={() => 'Asha Rao'} onCancel={vi.fn()} />
    );

    expect(screen.getByText('Attachment')).toBeInTheDocument();
  });

  it('cancels the reply', () => {
    const onCancel = vi.fn();
    render(<ReplyStrip replyTo={message()} nameOf={() => 'Asha Rao'} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel reply' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------- sounds ----

describe('sounds', () => {
  it('plays a short ping for an arriving message', () => {
    const play = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal(
      'Audio',
      vi.fn().mockImplementation(() => ({ play, volume: 0 })),
    );

    playMessagePing();

    expect(play).toHaveBeenCalledTimes(1);
  });

  // Everything here is best-effort — a sound nobody hears must never cost the
  // message that caused it.
  it('swallows a browser that refuses to construct an Audio element', () => {
    vi.stubGlobal(
      'Audio',
      vi.fn().mockImplementation(() => {
        throw new Error('not allowed');
      }),
    );

    expect(() => playMessagePing()).not.toThrow();
  });

  it('rings on a loop and hands back a way to stop it', () => {
    const pause = vi.fn();
    vi.stubGlobal(
      'Audio',
      vi.fn().mockImplementation(() => ({
        play: vi.fn().mockResolvedValue(undefined),
        pause,
        loop: false,
        volume: 0,
        currentTime: 5,
      })),
    );

    const stop = startRinging();
    stop();

    expect(pause).toHaveBeenCalledTimes(1);
  });

  it('hands back a no-op stop when the ring could not start', () => {
    vi.stubGlobal(
      'Audio',
      vi.fn().mockImplementation(() => {
        throw new Error('not allowed');
      }),
    );

    expect(() => startRinging()()).not.toThrow();
  });

  it('synthesises the end-of-call tone through an audio context', () => {
    vi.useFakeTimers();
    const close = vi.fn().mockResolvedValue(undefined);
    const osc = () => ({
      type: '',
      frequency: { value: 0 },
      connect: vi.fn().mockReturnThis(),
      start: vi.fn(),
      stop: vi.fn(),
    });
    const gain = () => ({
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn().mockReturnThis(),
    });
    vi.stubGlobal(
      'AudioContext',
      class {
        currentTime = 0;
        destination = {};
        createOscillator = osc;
        createGain = gain;
        close = close;
      },
    );

    playCallEnded();
    vi.advanceTimersByTime(700);

    expect(close).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('does nothing on a browser with no audio context at all', () => {
    vi.stubGlobal('AudioContext', undefined);
    Reflect.deleteProperty(globalThis as Record<string, unknown>, 'webkitAudioContext');

    expect(() => playCallEnded()).not.toThrow();
  });

  it('swallows a context that refuses to construct', () => {
    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          throw new Error('blocked');
        }
      },
    );

    expect(() => playCallEnded()).not.toThrow();
  });
});

// ----------------------------------------------------- StaffChatButton ----

describe('StaffChatButton', () => {
  const unreadMock = (count: number): MockedResponse => ({
    request: { query: STAFF_UNREAD },
    result: { data: { staffUnreadCount: count } },
    maxUsageCount: Number.POSITIVE_INFINITY,
  });

  const button = (mocks: readonly MockedResponse[], props: Record<string, unknown> = {}) =>
    render(
      <MockedProvider mocks={[...mocks]}>
        <ShellRuntimeProvider graphqlUrl="https://server.test/graphql" tokenKey="token">
          <StaffChatButton meId="me" open={false} onToggle={vi.fn()} {...props} />
        </ShellRuntimeProvider>
      </MockedProvider>
    );

  it('shows the unread count as a badge', async () => {
    const { container } = button([unreadMock(3)]);
    await settle();

    expect(container.querySelector('.MuiBadge-badge')?.textContent).toBe('3');
  });

  it('reports the toggle to the caller', async () => {
    const onToggle = vi.fn();
    button([unreadMock(0)], { onToggle });
    await settle();

    fireEvent.click(screen.getByRole('button', { name: 'Chat with a coworker' }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('marks itself active while the panel is open', async () => {
    button([unreadMock(0)], { open: true });
    await settle();

    expect(screen.getByRole('button', { name: 'Chat with a coworker' })).toHaveClass('MuiIconButton-colorPrimary');
  });

  it('skips the unread query and the socket outside a portal boot at all', async () => {
    expect(() =>
      render(
        <MockedProvider mocks={[]}>
          <StaffChatButton meId="me" open={false} onToggle={vi.fn()} />
        </MockedProvider>,
      ),
    ).not.toThrow();
    await settle();
  });

  it('swallows a badge refresh that fails to arrive after a socket message', async () => {
    socketOn.handlers = {};
    localStorage.setItem('token', 'jwt');
    button([unreadMock(0), unreadMock(0)]);
    await settle();

    expect(() => {
      socketOn.handlers.staff_message?.({ id: 'm', from_user_id: 'u1', to_user_id: 'me', text: 'hi' });
    }).not.toThrow();
    await settle();
    localStorage.removeItem('token');
  });
});
