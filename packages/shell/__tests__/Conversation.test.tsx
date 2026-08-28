/**
 * Conversation's own wiring: it owns no chat state itself, only the local
 * toggles between its children — selection mode, the clear/history/location
 * dialogs. Every child below it is stubbed here so this file can invoke each
 * callback directly; each child's own rendering is covered by its own tests.
 */
import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Conversation from '../src/staff-chat/Conversation';
import type { Coworker, StaffMessage } from '../src/staff-chat/queries';
import type { ChatFormats, ChatSettings } from '../src/staff-chat/useChatSettings';

let headerProps: Record<string, any> | null = null;
let footerProps: Record<string, any> | null = null;
let dialogsProps: Record<string, any> | null = null;
let threadProps: Record<string, any> | null = null;

vi.mock('../src/staff-chat/ConversationHeader', () => ({
  default: (props: Record<string, any>) => {
    headerProps = props;
    return <div data-testid="header" />;
  },
}));
vi.mock('../src/staff-chat/ConversationFooter', () => ({
  default: (props: Record<string, any>) => {
    footerProps = props;
    return <div data-testid="footer" />;
  },
}));
vi.mock('../src/staff-chat/ConversationDialogs', () => ({
  default: (props: Record<string, any>) => {
    dialogsProps = props;
    return <div data-testid="dialogs" />;
  },
}));
vi.mock('../src/staff-chat/MessageThread', () => ({
  default: (props: Record<string, any>) => {
    threadProps = props;
    return <div data-testid="thread" />;
  },
}));
vi.mock('../src/staff-chat/SelectionBar', () => ({
  default: () => <div data-testid="selection-bar" />,
}));
vi.mock('../src/staff-chat/ChatSearchPanel', () => ({
  default: () => <div data-testid="search-panel" />,
}));

const PEER: Coworker = { id: 'u-peer', name: 'Vikram N', email: '', photo: '', roles: [], phone: '', city: '' };
const FORMATS: ChatFormats = { time: 'h:mm a', full: 'PPpp', day: 'EEE' } as unknown as ChatFormats;
const SETTINGS: ChatSettings = {
  density: 'COMFORTABLE',
  bubbleColor: 'primary',
  fontSize: 14,
  timeZone: '',
  enterToSend: true,
};

const baseProps = () => ({
  peer: PEER,
  meId: 'u-me',
  status: 'ONLINE' as const,
  lastSeen: null,
  messages: [] as StaffMessage[],
  calls: [],
  onPlayRecording: vi.fn(),
  sending: false,
  upload: { active: false, pct: null as number | null },
  onBack: vi.fn(),
  onSend: vi.fn(),
  onAttach: vi.fn(),
  onVoiceNote: vi.fn(),
  paging: { loading: false, hasMore: false, loadingMore: false, onLoadMore: vi.fn() },
  settings: SETTINGS,
  formats: FORMATS,
  spacing: 1,
  nameOf: (id: string) => id,
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

describe('Conversation', () => {
  it('switches to the selection bar once a message is long-pressed into selection mode', () => {
    render(<Conversation {...baseProps()} />);
    expect(document.querySelector('[data-testid="header"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="selection-bar"]')).toBeNull();
    expect(threadProps?.onSelect).toBeUndefined();

    act(() => {
      threadProps?.onStartSelect('m-1');
    });

    expect(document.querySelector('[data-testid="selection-bar"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="header"]')).toBeNull();
    expect(threadProps?.onSelect).toBeTypeOf('function');
  });

  it('opens the clear-conversation confirm from the header, and cancels back out of it', () => {
    render(<Conversation {...baseProps()} />);

    act(() => {
      headerProps?.onClear();
    });
    expect(dialogsProps?.confirmClear).toBe(true);

    act(() => {
      dialogsProps?.onCancelClear();
    });
    expect(dialogsProps?.confirmClear).toBe(false);
  });

  it('reads edit history from the thread when allowed, and closes it again', () => {
    render(<Conversation {...baseProps()} canSeeEditHistory />);
    expect(threadProps?.onEditHistory).toBeTypeOf('function');
    const message = { id: 'm-1' } as StaffMessage;

    act(() => {
      threadProps?.onEditHistory(message);
    });
    expect(dialogsProps?.historyFor).toBe(message);

    act(() => {
      dialogsProps?.onCloseHistory();
    });
    expect(dialogsProps?.historyFor).toBeNull();
  });

  it('offers no edit history at all when this reader may not see it', () => {
    render(<Conversation {...baseProps()} canSeeEditHistory={false} />);
    expect(threadProps?.onEditHistory).toBeUndefined();
  });

  it('opens the location picker from the footer, and closes it again', () => {
    render(<Conversation {...baseProps()} />);

    act(() => {
      footerProps?.onShareLocation();
    });
    expect(dialogsProps?.locationOpen).toBe(true);

    act(() => {
      dialogsProps?.onCloseLocation();
    });
    expect(dialogsProps?.locationOpen).toBe(false);
  });

  it('shows a real percentage while a file is going up', () => {
    const { container } = render(<Conversation {...baseProps()} upload={{ active: true, pct: 0.4 }} />);
    const bar = container.querySelector('.MuiLinearProgress-root');
    expect(bar).not.toBeNull();
    expect(bar).toHaveClass('MuiLinearProgress-determinate');
  });

  it('shows an indeterminate bar while the percentage itself is not known yet', () => {
    const { container } = render(<Conversation {...baseProps()} upload={{ active: true, pct: null }} />);
    const bar = container.querySelector('.MuiLinearProgress-root');
    expect(bar).toHaveClass('MuiLinearProgress-indeterminate');
  });
});
