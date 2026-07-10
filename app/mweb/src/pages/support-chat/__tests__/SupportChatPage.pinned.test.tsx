import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SupportChatPage from '../SupportChatPage';
import type { SupportChatMessage } from '../queries';

function makeMessages(n: number): SupportChatMessage[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `m${i}`,
    session_id: 's1',
    sender_id: 'me',
    sender_role: 'USER' as const,
    sender_name: 'Riya',
    sender_photo: null,
    text: `hi ${i}`,
    attachments: [],
    is_ai: false,
    created_at: '2026-06-26T05:00:00.000Z',
  }));
}

const mockSend = vi.fn();
// Prefixed `mock…` so vitest allows referencing it inside the hoisted vi.mock factory.
let mockChat: Record<string, unknown>;

beforeEach(() => {
  mockSend.mockReset();
  mockChat = {
    session: { ticket_no: 'T1', status: 'OPEN', rating: 3, agent_last_read_at: null, reopen_deadline: null },
    sessionId: 's1',
    messages: makeMessages(2),
    closed: false,
    reopenable: false,
    typingText: '',
    loading: false,
    sending: false,
    resolving: false,
    reopening: false,
    send: mockSend,
    retry: vi.fn(),
    emitTyping: vi.fn(),
    resolve: vi.fn(),
    reopen: vi.fn(),
    download: vi.fn(),
    applyFeedback: vi.fn(),
  };
});

vi.mock('../SupportChatPage/useSupportChat', () => ({ useSupportChat: () => mockChat }));
vi.mock('../../../utils/dateFormat', () => ({
  useDateFormat: () => ({ formatDateTime: () => '', formatTime: () => '', timeZone: 'UTC' }),
}));
vi.mock('../ChatHeader', () => ({ default: () => <div data-testid="header" /> }));
vi.mock('../SupportChatPage/ChatDialogs', () => ({ default: () => <div data-testid="dialogs" /> }));
vi.mock('../SupportChatPage/ClosedNotice', () => ({ default: () => <div data-testid="closed" /> }));
vi.mock('../SupportChatPage/ChatMessageList', () => ({
  default: ({ scrollRef, onScroll }: { scrollRef: React.Ref<HTMLDivElement>; onScroll: () => void }) => (
    <div data-testid="list" ref={scrollRef} onScroll={onScroll} />
  ),
}));
vi.mock('../ChatComposer', () => ({
  default: ({ onSend }: { onSend: (t: string, a: string[]) => void }) => (
    <button data-testid="composer-send" onClick={() => onSend('hi', [])}>
      send
    </button>
  ),
}));

interface Metrics {
  scrollHeight: number;
  clientHeight: number;
  scrollTop: number;
}
function setMetrics(el: HTMLElement, m: Metrics) {
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: m.scrollHeight });
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: m.clientHeight });
  Object.defineProperty(el, 'scrollTop', { configurable: true, writable: true, value: m.scrollTop });
}

let scrollToSpy: ReturnType<typeof vi.fn>;
beforeEach(() => {
  scrollToSpy = vi.fn();
  (HTMLElement.prototype as unknown as { scrollTo: unknown }).scrollTo = scrollToSpy;
});
afterEach(() => {
  delete (HTMLElement.prototype as unknown as { scrollTo?: unknown }).scrollTo;
});

const renderPage = () => render(<SupportChatPage />, { wrapper: MemoryRouter });

describe('SupportChatPage — jump-to-latest', () => {
  it('auto-scrolls to the latest message on open (pinned by default)', () => {
    renderPage();
    expect(scrollToSpy).toHaveBeenCalled();
  });

  it('stops auto-following once the user scrolls up', () => {
    const { rerender } = renderPage();
    const list = screen.getByTestId('list');
    setMetrics(list, { scrollHeight: 1000, clientHeight: 500, scrollTop: 0 }); // distance 500 → unpin
    fireEvent.scroll(list);
    const calls = scrollToSpy.mock.calls.length;
    mockChat.messages = makeMessages(3);
    rerender(<SupportChatPage />);
    expect(scrollToSpy.mock.calls.length).toBe(calls);
  });

  it('shows the jump button past the threshold, then re-pins and hides on tap', () => {
    renderPage();
    const list = screen.getByTestId('list');
    setMetrics(list, { scrollHeight: 1000, clientHeight: 500, scrollTop: 0 });
    fireEvent.scroll(list);
    const fab = screen.getByLabelText('Jump to latest');
    scrollToSpy.mockClear();
    fireEvent.click(fab);
    expect(scrollToSpy).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
    expect(screen.queryByLabelText('Jump to latest')).not.toBeInTheDocument();
  });

  it('re-pins on send so the next message follows into view', () => {
    const { rerender } = renderPage();
    const list = screen.getByTestId('list');
    setMetrics(list, { scrollHeight: 1000, clientHeight: 500, scrollTop: 0 });
    fireEvent.scroll(list); // unpin
    fireEvent.click(screen.getByTestId('composer-send'));
    expect(mockSend).toHaveBeenCalledWith('hi', []);
    scrollToSpy.mockClear();
    mockChat.messages = makeMessages(3);
    rerender(<SupportChatPage />);
    expect(scrollToSpy).toHaveBeenCalled(); // pinned again → auto-scrolled
  });
});
