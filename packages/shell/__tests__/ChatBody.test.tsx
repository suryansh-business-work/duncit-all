/**
 * The panel's middle: pure wiring between the data layer and whichever of the
 * two screens is showing. Conversation and CoworkerList are stubbed here so
 * this file can prove every prop reaches the right call on `data` without
 * dragging in the whole conversation tree, which has its own tests.
 */
import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ChatBody from '../src/staff-chat/ChatBody';
import type { Coworker } from '../src/staff-chat/queries';
import type { ChatFormats, ChatSettings } from '../src/staff-chat/useChatSettings';

let conversationProps: Record<string, any> | null = null;
let coworkerListProps: Record<string, any> | null = null;

vi.mock('../src/staff-chat/Conversation', () => ({
  default: (props: Record<string, any>) => {
    conversationProps = props;
    return <div data-testid="conversation" />;
  },
}));

vi.mock('../src/staff-chat/CoworkerList', () => ({
  default: (props: Record<string, any>) => {
    coworkerListProps = props;
    return <div data-testid="coworker-list" />;
  },
}));

const PEER = { id: 'u-peer', name: 'Vikram N' } as Coworker;

const MUTATIONS = {
  editMessage: 'EDIT_MUT',
  deleteMessage: 'DELETE_MUT',
  reactToMessage: 'REACT_MUT',
  forwardMessage: 'FORWARD_MUT',
  pinMessage: 'PIN_MUT',
};

const makeData = (over: Record<string, unknown> = {}) => ({
  change: vi.fn(),
  mutations: MUTATIONS,
  statusOf: vi.fn(() => 'online'),
  lastSeenOf: vi.fn(() => null),
  visibleMessages: [],
  calls: [],
  sending: false,
  uploading: false,
  uploadPct: 0,
  send: vi.fn(),
  attachFile: vi.fn(),
  hideForMe: vi.fn(),
  retry: vi.fn(),
  messagesLoading: false,
  hasMore: false,
  loadingMore: false,
  loadOlder: vi.fn(),
  nameOf: vi.fn(() => 'Someone'),
  typing: vi.fn(),
  typingAt: {} as Record<string, number>,
  exportChat: vi.fn(async () => undefined),
  clearConversation: vi.fn(),
  threads: [],
  coworkers: [],
  ...over,
});

const baseProps = (data: ReturnType<typeof makeData>, over: Record<string, unknown> = {}) => ({
  data: data as never,
  meId: 'u-me',
  peer: PEER,
  onOpenPeer: vi.fn(),
  search: '',
  onSearch: vi.fn(),
  role: '',
  onRole: vi.fn(),
  settings: {} as ChatSettings,
  formats: {} as ChatFormats,
  spacing: 1,
  replyTo: null,
  onReplyTo: vi.fn(),
  onCall: vi.fn(),
  onPlayRecording: vi.fn(),
  onSettings: vi.fn(),
  canSeeEditHistory: false,
  ...over,
});

describe('ChatBody', () => {
  it('opens on the conversation, wiring every action to the data layer', async () => {
    const data = makeData();
    const props = baseProps(data);
    render(<ChatBody {...(props as never)} />);

    expect(conversationProps?.peer).toBe(PEER);
    expect(conversationProps?.status).toBe('online');
    expect(conversationProps?.typingAt).toBe(0);

    conversationProps?.onBack();
    expect(props.onOpenPeer).toHaveBeenCalledWith(null);

    conversationProps?.onAttach({ name: 'a.png' });
    expect(data.attachFile).toHaveBeenCalledWith({ name: 'a.png' });

    conversationProps?.onVoiceNote({ name: 'v.webm' }, [1, 2]);
    expect(data.attachFile).toHaveBeenCalledWith({ name: 'v.webm' }, [1, 2]);

    conversationProps?.handlers.onEdit('m1', 'new text');
    expect(data.change).toHaveBeenCalledWith(MUTATIONS.editMessage, { id: 'm1', text: 'new text' });

    conversationProps?.handlers.onDelete('m1', true);
    expect(data.change).toHaveBeenCalledWith(MUTATIONS.deleteMessage, { id: 'm1' });

    conversationProps?.handlers.onDelete('m1', false);
    expect(data.hideForMe).toHaveBeenCalledWith('m1');

    conversationProps?.handlers.onReact('m1', '👍');
    expect(data.change).toHaveBeenCalledWith(MUTATIONS.reactToMessage, { id: 'm1', emoji: '👍' });

    conversationProps?.handlers.onReply({ id: 'm2' });
    expect(props.onReplyTo).toHaveBeenCalledWith({ id: 'm2' });

    conversationProps?.handlers.onForward({ id: 'm3' });
    expect(data.change).toHaveBeenCalledWith(MUTATIONS.forwardMessage, { id: 'm3', toUserId: PEER.id });

    conversationProps?.handlers.onPin('m1');
    expect(data.change).toHaveBeenCalledWith(MUTATIONS.pinMessage, { id: 'm1' });

    conversationProps?.handlers.onRetry('m1');
    expect(data.retry).toHaveBeenCalledWith('m1');

    conversationProps?.onCancelReply();
    expect(props.onReplyTo).toHaveBeenCalledWith(null);

    conversationProps?.onTyping();
    expect(data.typing).toHaveBeenCalledWith(PEER.id);

    conversationProps?.actions.onCall('AUDIO');
    expect(props.onCall).toHaveBeenCalledWith('AUDIO');

    await act(async () => {
      await conversationProps?.actions.onExport();
    });
    expect(data.exportChat).toHaveBeenCalledTimes(1);

    conversationProps?.actions.onClear();
    expect(data.clearConversation).toHaveBeenCalledTimes(1);

    conversationProps?.actions.onSettings();
    expect(props.onSettings).toHaveBeenCalledTimes(1);
  });

  it('reads a live typing timestamp for the open peer, rather than the fallback', () => {
    const data = makeData({ typingAt: { [PEER.id]: 123456 } });
    render(<ChatBody {...(baseProps(data) as never)} />);

    expect(conversationProps?.typingAt).toBe(123456);
  });

  it('swallows an export that fails, rather than throwing out of the menu', async () => {
    const data = makeData({ exportChat: vi.fn(async () => { throw new Error('export failed'); }) });
    render(<ChatBody {...(baseProps(data) as never)} />);

    await expect(conversationProps?.actions.onExport()).resolves.toBeUndefined();
  });

  it('shows the coworker directory when no peer is open, and reports the one picked', () => {
    const data = makeData({ threads: [{ id: 't1' }], coworkers: [{ id: 'c1' }] });
    const props = baseProps(data, { peer: null });
    render(<ChatBody {...(props as never)} />);

    expect(coworkerListProps?.threads).toBe(data.threads);
    expect(coworkerListProps?.coworkers).toBe(data.coworkers);

    coworkerListProps?.onOpen(PEER);
    expect(props.onOpenPeer).toHaveBeenCalledWith(PEER);
  });
});
