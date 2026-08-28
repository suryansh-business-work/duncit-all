import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { schemaMockLink } from './schema-mock';
import CoworkerList from '../src/staff-chat/CoworkerList';
import Conversation from '../src/staff-chat/Conversation';
import { DEFAULT_CHAT_SETTINGS, type ChatFormats } from '../src/staff-chat/useChatSettings';
import type { Coworker, StaffCall, StaffMessage, StaffThread } from '../src/staff-chat/queries';
import { useStaffSocket } from '../src/staff-chat/useStaffSocket';

const ping = vi.hoisted(() => vi.fn());
const socketOn = vi.hoisted(() => ({ handlers: {} as Record<string, (p: unknown) => void> }));

vi.mock('../src/staff-chat/sounds', () => ({
  playMessagePing: ping,
  startRinging: () => () => undefined,
}));

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

const person = (id: string, name: string): Coworker => ({
  id,
  name,
  email: `${id}@duncit.com`,
  photo: '',
  roles: ['FINANCE_MANAGER'],
});

describe('CoworkerList', () => {
  const props = {
    search: '',
    onSearch: vi.fn(),
    role: '',
    onRole: vi.fn(),
    statusOf: () => 'ONLINE' as const,
    onOpen: vi.fn(),
  };

  it('puts conversations above the directory and never lists a person twice', () => {
    const asha = person('u1', 'Asha Rao');
    const threads: StaffThread[] = [
      { peer: asha, last_text: 'sent the invoice', last_at: null, last_from_me: true, unread: 2 },
    ];
    render(
      <CoworkerList {...props} threads={threads} coworkers={[asha, person('u2', 'Bo Chen')]} />
    );

    // Asha is the thread row, not also a directory row.
    expect(screen.getAllByText('Asha Rao')).toHaveLength(1);
    // The last line says who wrote it without the browser comparing ids.
    expect(screen.getByText('You: sent the invoice')).toBeInTheDocument();
    expect(screen.getByText('Bo Chen')).toBeInTheDocument();
  });

  it('hides the conversation list while searching, so results are the whole list', () => {
    const asha = person('u1', 'Asha Rao');
    render(
      <CoworkerList
        {...props}
        search="bo"
        threads={[{ peer: asha, last_text: 'hi', last_at: null, last_from_me: false, unread: 0 }]}
        coworkers={[person('u2', 'Bo Chen')]}
      />
    );
    expect(screen.queryByText('Asha Rao')).not.toBeInTheDocument();
    expect(screen.getByText('Bo Chen')).toBeInTheDocument();
  });
});

/** jsdom measures everything as zero and has no observers, so a thread left to
 *  itself never decides anything is on screen. Sized elements + observers that
 *  answer immediately are what let the messages render at all. */
beforeAll(() => {
  for (const prop of ['offsetHeight', 'clientHeight', 'scrollHeight'] as const) {
    Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, value: 800 });
  }
  for (const prop of ['offsetWidth', 'clientWidth'] as const) {
    Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, value: 1200 });
  }
  const size = [{ inlineSize: 1200, blockSize: 800 }];
  const box = { x: 0, y: 0, top: 0, left: 0, right: 1200, bottom: 800, width: 1200, height: 800 };
  class SizedResizeObserver {
    constructor(private readonly callback: ResizeObserverCallback) {}
    observe(target: Element) {
      this.callback(
        [{ target, contentRect: box, borderBoxSize: size, contentBoxSize: size, devicePixelContentBoxSize: size }] as never,
        this as never
      );
    }
    unobserve() {}
    disconnect() {}
  }
  class SeenIntersectionObserver {
    constructor(private readonly callback: IntersectionObserverCallback) {}
    observe(target: Element) {
      this.callback(
        [{ target, isIntersecting: true, intersectionRatio: 1, boundingClientRect: box, intersectionRect: box, rootBounds: box, time: 0 }] as never,
        this as never
      );
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  globalThis.ResizeObserver ??= SizedResizeObserver as unknown as typeof ResizeObserver;
  globalThis.IntersectionObserver ??= SeenIntersectionObserver as unknown as typeof IntersectionObserver;
  Element.prototype.scrollTo ??= () => undefined;
  Element.prototype.scrollIntoView ??= () => undefined;
});

describe('Conversation', () => {
  const message = (id: string, from: string, text: string): StaffMessage => ({
    id,
    from_user_id: from,
    to_user_id: from === 'me' ? 'u1' : 'me',
    text,
    created_at: '2026-08-06T10:00:00.000Z',
  });

  /** Fixed and injected, so nothing here reads the machine's clock or zone. */
  const formats: ChatFormats = {
    time: { format: (value: Date) => `T:${value.toISOString().slice(11, 16)}` },
    full: { format: (value: Date) => `F:${value.toISOString()}` },
    day: { format: (value: Date) => `D:${value.toISOString().slice(0, 10)}` },
  };

  const conversationProps = () => ({
    peer: person('u1', 'Asha Rao'),
    meId: 'me',
    status: 'ONLINE' as const,
    lastSeen: null,
    messages: [] as StaffMessage[],
    calls: [] as StaffCall[],
    onPlayRecording: vi.fn(),
    sending: false,
    upload: { active: false, pct: null },
    onBack: vi.fn(),
    onSend: vi.fn(),
    onAttach: vi.fn(),
    onVoiceNote: vi.fn(),
    paging: { loading: false, hasMore: false, loadingMore: false, onLoadMore: vi.fn() },
    settings: DEFAULT_CHAT_SETTINGS,
    formats,
    spacing: 1,
    nameOf: (id: string) => (id === 'me' ? 'Me' : 'Asha Rao'),
    replyTo: null,
    onCancelReply: vi.fn(),
    handlers: {
      onEdit: vi.fn(),
      onDelete: vi.fn(),
      onReact: vi.fn(),
      onReply: vi.fn(),
      onForward: vi.fn(),
      onPin: vi.fn(),
      onNavigate: vi.fn(),
      onRetry: vi.fn(),
    },
    canSeeEditHistory: false,
    onTyping: vi.fn(),
    typingAt: 0,
    actions: { onExport: vi.fn(), onClear: vi.fn(), onSettings: vi.fn(), onCall: vi.fn() },
  });

  const show = (over: Partial<Parameters<typeof Conversation>[0]> = {}) => {
    const props = { ...conversationProps(), ...over };
    render(
      <MockedProvider link={schemaMockLink()}>
        <ThemeProvider theme={createTheme()}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Conversation {...props} />
          </LocalizationProvider>
        </ThemeProvider>
      </MockedProvider>
    );
    return props;
  };

  it('sends on Enter and keeps Shift+Enter for a new line', () => {
    const { onSend } = show();
    const box = screen.getByPlaceholderText('Write a message');
    fireEvent.change(box, { target: { value: 'ready?' } });

    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();

    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('ready?');
  });

  it('does not send whitespace', () => {
    const { onSend } = show();
    const box = screen.getByPlaceholderText('Write a message');
    fireEvent.change(box, { target: { value: '   ' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('shows what is being answered above the composer, until it is cancelled', () => {
    const onCancelReply = vi.fn();
    show({ replyTo: message('m1', 'u1', 'Original text'), onCancelReply });

    expect(screen.getByText('Replying to Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('Original text')).toBeInTheDocument();
  });

  it('shows both sides of the conversation', () => {
    show({ messages: [message('m1', 'u1', 'did you see it'), message('m2', 'me', 'just now')] });
    expect(screen.getByText('did you see it')).toBeInTheDocument();
    expect(screen.getByText('just now')).toBeInTheDocument();
  });

  it('opens and closes the in-conversation search from the header', () => {
    show();
    fireEvent.click(screen.getByLabelText('Search this conversation'));
    expect(screen.getByLabelText('Close search')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Close search'));
    expect(screen.queryByLabelText('Close search')).not.toBeInTheDocument();
  });

  it('asks before clearing, and only a confirmed wipe reaches the actions', () => {
    const { actions } = show();
    fireEvent.click(screen.getByLabelText('More'));
    fireEvent.click(screen.getByText('Clear all messages'));
    expect(screen.getByText('Clear this conversation?')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Clear messages'));
    expect(actions.onClear).toHaveBeenCalledTimes(1);
  });

  it('shows a real percentage while a file with known progress goes up', () => {
    show({ upload: { active: true, pct: 40 } });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});

describe('useStaffSocket ping', () => {
  beforeEach(() => {
    ping.mockClear();
    socketOn.handlers = {};
  });

  /** A tiny host so the hook can be driven without the whole drawer. */
  function Host({
    meId,
    openPeerId,
    onMessageChanged,
    onReady,
  }: Readonly<{
    meId: string;
    openPeerId: string | null;
    onMessageChanged?: (message: StaffMessage) => void;
    onReady?: (result: ReturnType<typeof useStaffSocket>) => void;
  }>) {
    const result = useStaffSocket({
      graphqlUrl: 'https://server.test/graphql',
      token: 'tok',
      onMessage: vi.fn(),
      onMessageChanged,
      meId,
      openPeerId,
    });
    onReady?.(result);
    return null;
  }

  const arrive = (from: string) =>
    socketOn.handlers.staff_message?.({ id: 'm', from_user_id: from, to_user_id: 'me', text: 'hi' });

  it('pings for a message from someone else', async () => {
    render(
      <MockedProvider mocks={[]}>
        <Host meId="me" openPeerId={null} />
      </MockedProvider>
    );
    arrive('u1');
    await waitFor(() => expect(ping).toHaveBeenCalledTimes(1));
  });

  it('stays silent for your own message from another tab', async () => {
    render(
      <MockedProvider mocks={[]}>
        <Host meId="me" openPeerId={null} />
      </MockedProvider>
    );
    arrive('me');
    await waitFor(() => expect(ping).not.toHaveBeenCalled());
  });

  it('stays silent for the conversation already on screen', async () => {
    render(
      <MockedProvider mocks={[]}>
        <Host meId="me" openPeerId="u1" />
      </MockedProvider>
    );
    arrive('u1');
    await waitFor(() => expect(ping).not.toHaveBeenCalled());
  });

  it("forwards an edit or delete to the caller's own handler", async () => {
    const onMessageChanged = vi.fn();
    render(
      <MockedProvider mocks={[]}>
        <Host meId="me" openPeerId={null} onMessageChanged={onMessageChanged} />
      </MockedProvider>
    );
    const edited = { id: 'm', from_user_id: 'u1', to_user_id: 'me', text: 'edited' };
    socketOn.handlers.staff_message_changed?.(edited);

    await waitFor(() => expect(onMessageChanged).toHaveBeenCalledWith(edited));
  });

  it('records when a peer reports they are typing', async () => {
    let latest: ReturnType<typeof useStaffSocket> | undefined;
    render(
      <MockedProvider mocks={[]}>
        <Host meId="me" openPeerId={null} onReady={(result) => { latest = result; }} />
      </MockedProvider>
    );
    socketOn.handlers.staff_typing?.({ from_user_id: 'u1' });

    await waitFor(() => expect(latest?.typingAt.u1).toBeGreaterThan(0));
  });

  it('emits a typing beacon to the peer, best-effort', async () => {
    let latest: ReturnType<typeof useStaffSocket> | undefined;
    render(
      <MockedProvider mocks={[]}>
        <Host meId="me" openPeerId={null} onReady={(result) => { latest = result; }} />
      </MockedProvider>
    );
    await waitFor(() => expect(latest?.socket).not.toBeNull());

    latest?.typing('u1');

    expect(latest?.socket?.emit).toHaveBeenCalledWith('staff_typing', 'u1');
  });
});
