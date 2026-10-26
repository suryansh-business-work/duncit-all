import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AccessibilityInfo, Pressable } from 'react-native';

import { PodMessageType, VenueChatSide } from '@/generated/graphql/graphql';
import { useChatImagePicker } from '@/hooks/useChatImagePicker';
import { useMe } from '@/hooks/useMe';
import { useVenueChat, type VenueChatMessage } from '@/hooks/useVenueChat';
import { useVenueChatLineActions } from '@/hooks/useVenueChatLineActions';
import { useVenueChatMarkRead } from '@/hooks/useVenueChatMarkRead';
import { useVenueChatSocket } from '@/hooks/useVenueChatSocket';
import { useOfferCards } from '@/components/venue-chat/useOfferCards';
import { VenueChatScreen } from '@/screens/VenueChatScreen';
import { renderWithProviders } from '@/utils/test-utils';
import {
  offerMove,
  offerTerms,
  venueChatLine,
  venueChatRoomFixture,
} from '@/utils/venue-offer-fixture';

jest.mock('@/hooks/useVenueChat', () => ({ useVenueChat: jest.fn() }));
jest.mock('@/hooks/useVenueChatSocket', () => ({ useVenueChatSocket: jest.fn() }));
jest.mock('@/hooks/useVenueChatMarkRead', () => ({ useVenueChatMarkRead: jest.fn() }));
jest.mock('@/hooks/useVenueChatLineActions', () => ({ useVenueChatLineActions: jest.fn() }));
jest.mock('@/hooks/useMe', () => ({ useMe: jest.fn() }));
jest.mock('@/hooks/useChatImagePicker', () => ({ useChatImagePicker: jest.fn() }));
jest.mock('@/components/venue-chat/useOfferCards', () => ({ useOfferCards: jest.fn() }));
jest.mock('@/components/venue-chat/VenueChatResubmit', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    VenueChatResubmit: (props: {
      move: { event: string } | null;
      onError: (m: string) => void;
    }) => (
      <Text testID="resubmit-stub" onPress={() => props.onError('Could not open')}>
        {props.move ? props.move.event : 'none'}
      </Text>
    ),
  };
});

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
let mockCanGoBack = true;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    canGoBack: () => mockCanGoBack,
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: () => ({ params: { podId: 'pod-1' } }),
}));

const chatHook = useVenueChat as jest.Mock;
const socketHook = useVenueChatSocket as jest.Mock;
const markReadHook = useVenueChatMarkRead as jest.Mock;
const actionsHook = useVenueChatLineActions as jest.Mock;
const cardsHook = useOfferCards as jest.Mock;
const pickImage = jest.fn(() => Promise.resolve());
const lineActions = {
  react: jest.fn(() => Promise.resolve<string | null>(null)),
  edit: jest.fn(() => Promise.resolve<string | null>(null)),
  remove: jest.fn(() => Promise.resolve<string | null>(null)),
};

const chatState = (over: Record<string, unknown> = {}) => ({
  room: venueChatRoomFixture(),
  messages: [] as VenueChatMessage[],
  marks: [],
  isLoading: false,
  unavailable: false,
  loadFailed: false,
  history: {
    hasOlder: false,
    loadingOlder: false,
    olderFailed: false,
    startHistory: jest.fn(),
    loadOlder: jest.fn(() => Promise.resolve()),
    onScroll: jest.fn(),
  },
  sending: false,
  error: null,
  setError: jest.fn(),
  reload: jest.fn(),
  addLines: jest.fn(),
  replaceLine: jest.fn(),
  removeLine: jest.fn(),
  addMark: jest.fn(),
  sendText: jest.fn(() => Promise.resolve(true)),
  sendImage: jest.fn(),
  ...over,
});

const cardsState = (over: Record<string, unknown> = {}) => ({
  renderCard: jest.fn(() => null),
  live: null,
  side: 'HOST',
  notice: null,
  clearNotice: jest.fn(),
  newOffer: null,
  closeNewOffer: jest.fn(),
  ...over,
});

const mount = (chat = chatState(), cards = cardsState()) => {
  chatHook.mockReturnValue(chat);
  cardsHook.mockReturnValue(cards);
  renderWithProviders(<VenueChatScreen />);
  return { chat, cards };
};

/** Long-presses a line and picks one of its actions. */
const pickAction = (lineId: string, action: string) => {
  fireEvent(screen.getByTestId(`chat-message-${lineId}`), 'longPress');
  fireEvent.press(screen.getByTestId(`chat-message-action-${action}`));
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCanGoBack = true;
  (useMe as jest.Mock).mockReturnValue({ data: { me: { user_id: 'u1' } } });
  (useChatImagePicker as jest.Mock).mockReturnValue(pickImage);
  actionsHook.mockReturnValue(lineActions);
  lineActions.react.mockResolvedValue(null);
  lineActions.edit.mockResolvedValue(null);
  lineActions.remove.mockResolvedValue(null);
});

describe('VenueChatScreen', () => {
  it('opens the thread with the other side, and wires the offers, the socket and the read marks', () => {
    const { chat } = mount();
    expect(screen.getByTestId('venue-chat-title')).toHaveTextContent('Court House');
    expect(screen.getByText('Start the conversation with the venue')).toBeOnTheScreen();
    // The thread's offers ride on its own lines and read marks, read once the first page is in.
    expect(cardsHook).toHaveBeenCalledWith('pod-1', chat.room, chat.messages, true, chat.marks);
    expect(socketHook).toHaveBeenCalledWith(expect.objectContaining({ podId: 'pod-1' }));
    expect(markReadHook).toHaveBeenCalledWith({
      podId: 'pod-1',
      lines: chat.messages,
      meId: 'u1',
      ready: true,
    });
    expect(screen.getByTestId('resubmit-stub')).toHaveTextContent('none');
    // No live offer: nothing pinned.
    expect(screen.queryByTestId('venue-chat-offer-pin')).toBeNull();
  });

  it('feeds every socket frame to the thread and names a refused join', () => {
    const { chat } = mount();
    const handlers = socketHook.mock.calls[0][0];
    const line = venueChatLine({ id: 'l9' });
    handlers.onLine(line);
    expect(chat.addLines).toHaveBeenCalledWith([line]);
    expect(handlers.onUpdate).toBe(chat.replaceLine);
    expect(handlers.onRemove).toBe(chat.removeLine);
    expect(handlers.onRead).toBe(chat.addMark);
    handlers.onJoinFailed('FORBIDDEN');
    expect(chat.setError).toHaveBeenCalledWith(
      "This chat is not available. Only this pod's hosts and its venue can open it.",
    );
    handlers.onJoinFailed('ERROR');
    expect(chat.setError).toHaveBeenCalledWith(
      'Live updates are paused. New messages show when you reopen the chat.',
    );
  });

  it('pins where the live offer stands and both sides’ counters left under the header', () => {
    mount(chatState(), cardsState({ live: offerTerms({ host_counters_used: 1 }) }));
    const pin = screen.getByTestId('venue-chat-offer-pin');
    // The host's offer waits on the venue.
    expect(within(pin).getByTestId('venue-chat-offer-pin-status')).toHaveTextContent(
      'Waiting for their answer',
    );
    expect(within(pin).getByTestId('venue-chat-offer-pin-counters')).toHaveTextContent(
      'You: 2 of 3 counters left · Venue: 3 of 3 left',
    );
  });

  it('opens both parties’ contacts in a sheet, and their profile or page from it', () => {
    mount();
    fireEvent.press(screen.getByTestId('venue-chat-contact-open'));
    expect(screen.getByTestId('venue-chat-host-card')).toBeOnTheScreen();
    expect(screen.getByTestId('venue-chat-venue-card')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('venue-chat-host-profile'));
    expect(mockNavigate).toHaveBeenCalledWith('PublicProfile', { userId: 'host-1' });
    expect(screen.queryByTestId('venue-chat-host-card')).toBeNull();

    fireEvent.press(screen.getByTestId('venue-chat-contact-open'));
    fireEvent.press(screen.getByTestId('venue-chat-venue-page'));
    expect(mockNavigate).toHaveBeenCalledWith('VenueDetails', { venueId: 'venue-1' });
  });

  it('draws each line with its time, its edited mark and the faces of who has read that far', () => {
    const lines = [
      venueChatLine({ id: 'l1', user_id: 'u1', text: 'Hi', createdAt: '2026-08-29T10:00:00.000Z' }),
      venueChatLine({
        id: 'l2',
        text: 'Hello',
        edited_at: '2026-08-29T10:02:00.000Z',
        createdAt: '2026-08-29T10:01:00.000Z',
      }),
    ];
    const marks = [
      {
        user_id: 'owner-1',
        side: 'VENUE' as const,
        name: 'Asha Rao',
        photo: null,
        last_read_at: '2026-08-29T10:00:30.000Z',
      },
    ];
    mount(chatState({ messages: lines, marks }));
    expect(screen.getByTestId('chat-line-time-l2')).toHaveTextContent(/Edited$/);
    expect(screen.getByTestId('chat-line-time-l1')).not.toHaveTextContent(/Edited/);
    // The venue read up to the host's own line, not past it.
    expect(screen.getByLabelText('Seen by Asha Rao')).toBeOnTheScreen();
    expect(screen.getByTestId('venue-chat-seen-l1')).toBeOnTheScreen();
    expect(screen.queryByTestId('venue-chat-seen-l2')).toBeNull();
  });

  it('draws an offer line as its card, with the time it was sent and its own menu', () => {
    const offerLine = venueChatLine({
      id: 'o1',
      type: PodMessageType.Offer,
      text: '',
      offer: offerMove(),
      reactions: [{ user_id: 'u2', emoji: '🎉' }],
    });
    const renderCard = jest.fn(
      (_line: VenueChatMessage, decor: { footer: ReactNode; onLongPress?: () => void }) => (
        <Pressable testID="offer-card" onLongPress={decor.onLongPress}>
          {decor.footer}
        </Pressable>
      ),
    );
    mount(chatState({ messages: [offerLine] }), cardsState({ renderCard }));
    expect(renderCard).toHaveBeenCalledWith(offerLine, expect.any(Object));
    expect(screen.getByTestId('chat-line-time-o1')).toHaveTextContent(/^Sent /);
    expect(screen.getByTestId('reaction-o1-🎉')).toBeOnTheScreen();
    // Not drawn twice as a bubble.
    expect(screen.queryByTestId('chat-message-o1')).toBeNull();
    fireEvent(screen.getByTestId('offer-card'), 'longPress');
    // An offer line changes only through the offer itself: react, nothing else.
    expect(screen.getByTestId('chat-message-action-react')).toBeOnTheScreen();
    expect(screen.queryByTestId('chat-message-action-edit')).toBeNull();
    expect(screen.queryByTestId('chat-message-action-delete')).toBeNull();
  });

  it('reacts to a line from its menu, and says a refused reaction in the banner', async () => {
    const { chat } = mount(chatState({ messages: [venueChatLine({ id: 'l2' })] }));
    pickAction('l2', 'react');
    // Someone else's line: no edit, no delete.
    fireEvent.press(screen.getByTestId('emoji-🔥'));
    await waitFor(() => expect(lineActions.react).toHaveBeenCalledWith('l2', '🔥'));
    expect(screen.queryByTestId('emoji-bar')).toBeNull();

    lineActions.react.mockResolvedValue('That did not go through. Please try again.');
    pickAction('l2', 'react');
    await act(async () => {
      fireEvent.press(screen.getByTestId('emoji-👍'));
    });
    await waitFor(() =>
      expect(chat.setError).toHaveBeenCalledWith('That did not go through. Please try again.'),
    );
  });

  it('toggles the reader’s own reaction from its chip', async () => {
    const reacted = venueChatLine({ id: 'l2', reactions: [{ user_id: 'u1', emoji: '👍' }] });
    mount(chatState({ messages: [reacted] }));
    const chip = screen.getByTestId('reaction-l2-👍');
    expect(chip).toHaveProp('aria-selected', true);
    fireEvent.press(chip);
    await waitFor(() => expect(lineActions.react).toHaveBeenCalledWith('l2', '👍'));
  });

  it('only offers react on someone else’s line, edit and delete on the reader’s own', () => {
    mount(
      chatState({
        messages: [venueChatLine({ id: 'l1', user_id: 'u1' }), venueChatLine({ id: 'l2' })],
      }),
    );
    fireEvent(screen.getByTestId('chat-message-l2'), 'longPress');
    expect(screen.queryByTestId('chat-message-action-edit')).toBeNull();
    expect(screen.queryByTestId('chat-message-action-delete')).toBeNull();
    expect(screen.queryByTestId('chat-message-action-report')).toBeNull();
    fireEvent.press(screen.getByTestId('chat-message-actions-close'));

    fireEvent(screen.getByTestId('chat-message-l1'), 'longPress');
    expect(screen.getByTestId('chat-message-action-edit')).toBeOnTheScreen();
    expect(screen.getByTestId('chat-message-action-delete')).toBeOnTheScreen();
  });

  it('edits the reader’s own line in a dialog that starts from its words', async () => {
    mount(
      chatState({ messages: [venueChatLine({ id: 'l1', user_id: 'u1', text: 'See you at 6' })] }),
    );
    pickAction('l1', 'edit');
    expect(screen.getByTestId('venue-chat-edit-title')).toHaveTextContent('Edit message');
    expect(screen.getByTestId('field-text')).toHaveProp('value', 'See you at 6');
    fireEvent.changeText(screen.getByTestId('field-text'), '  See you at 7  ');
    await act(async () => {
      fireEvent.press(screen.getByTestId('venue-chat-edit-save'));
    });
    await waitFor(() => expect(lineActions.edit).toHaveBeenCalledWith('l1', 'See you at 7'));
    await waitFor(() => expect(screen.queryByTestId('venue-chat-edit-save')).toBeNull());
  });

  it('keeps the edit open with the reason when it is refused, and never saves nothing', async () => {
    lineActions.edit.mockResolvedValue('Messages cannot share phone numbers');
    mount(chatState({ messages: [venueChatLine({ id: 'l1', user_id: 'u1' })] }));
    pickAction('l1', 'edit');
    fireEvent.changeText(screen.getByTestId('field-text'), '   ');
    await act(async () => {
      fireEvent.press(screen.getByTestId('venue-chat-edit-save'));
    });
    expect(lineActions.edit).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByTestId('field-text'), 'Call me on 9000000000');
    await act(async () => {
      fireEvent.press(screen.getByTestId('venue-chat-edit-save'));
    });
    await waitFor(() =>
      expect(screen.getByTestId('venue-chat-edit-error')).toHaveTextContent(
        'Messages cannot share phone numbers',
      ),
    );
  });

  it('deletes the reader’s own line only once confirmed', async () => {
    mount(chatState({ messages: [venueChatLine({ id: 'l1', user_id: 'u1' })] }));
    pickAction('l1', 'delete');
    expect(screen.getByText('Delete this message?')).toBeOnTheScreen();
    expect(lineActions.remove).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.press(screen.getByTestId('venue-chat-delete-confirm-btn'));
    });
    expect(lineActions.remove).toHaveBeenCalledWith('l1');
    await waitFor(() => expect(screen.queryByText('Delete this message?')).toBeNull());
  });

  it("shows the last offer answer's notice, and a new offer that could not open lands in the banner", () => {
    const cards = cardsState({
      notice: { tone: 'success', text: 'Your counter was sent to the venue.' },
      newOffer: offerMove({ event: 'DECLINED' }),
    });
    const { chat } = mount(chatState(), cards);
    fireEvent.press(screen.getByTestId('venue-chat-offer-notice'));
    expect(cards.clearNotice).toHaveBeenCalled();
    expect(screen.getByTestId('resubmit-stub')).toHaveTextContent('DECLINED');
    fireEvent.press(screen.getByTestId('resubmit-stub'));
    expect(chat.setError).toHaveBeenCalledWith('Could not open');
  });

  it('says an error out loud and lets the reader dismiss it', () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    const { chat } = mount(chatState({ error: 'Could not send' }));
    expect(announce).toHaveBeenCalledWith('Could not send');
    fireEvent.press(screen.getByTestId('chat-room-error'));
    expect(chat.setError).toHaveBeenCalledWith(null);
  });

  it('sends a typed line and clears the box, picks a photo and adds an emoji', async () => {
    const { chat } = mount();
    fireEvent.changeText(screen.getByTestId('chat-input'), 'See you at 6');
    await act(async () => {
      fireEvent.press(screen.getByTestId('chat-send'));
    });
    expect(chat.sendText).toHaveBeenCalledWith('See you at 6');
    expect(screen.getByTestId('chat-input')).toHaveProp('value', '');

    fireEvent.press(screen.getByTestId('chat-pick-image'));
    expect(pickImage).toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('chat-emoji-toggle'));
    fireEvent.press(screen.getByTestId('emoji-👍'));
    expect(screen.getByTestId('chat-input')).toHaveProp('value', '👍');
    expect(screen.queryByTestId('emoji-bar')).toBeNull();
    expect(lineActions.react).not.toHaveBeenCalled();
  });

  it('keeps the text when the line could not be sent', async () => {
    mount(chatState({ sendText: jest.fn(() => Promise.resolve(false)) }));
    fireEvent.changeText(screen.getByTestId('chat-input'), 'Hello');
    await act(async () => {
      fireEvent.press(screen.getByTestId('chat-send'));
    });
    expect(screen.getByTestId('chat-input')).toHaveProp('value', 'Hello');
  });

  it("goes back where it came from, or to each side's own screen", () => {
    mount();
    fireEvent.press(screen.getByTestId('venue-chat-back'));
    expect(mockGoBack).toHaveBeenCalled();

    mockCanGoBack = false;
    fireEvent.press(screen.getByTestId('venue-chat-back'));
    expect(mockNavigate).toHaveBeenCalledWith('HostManage');
  });

  it("sends the venue back to its pods, with the venue's empty sentence", () => {
    mockCanGoBack = false;
    mount(chatState({ room: venueChatRoomFixture({ my_side: VenueChatSide.Venue }) }));
    expect(screen.getByText('Start the conversation with the host')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('venue-chat-back'));
    expect(mockNavigate).toHaveBeenCalledWith('VenuePods');
  });

  it('closes a thread that is not the reader’s, and retries one that failed to load', () => {
    mount(chatState({ room: null, unavailable: true, loadFailed: true }));
    expect(screen.getByTestId('venue-chat-unavailable')).toBeOnTheScreen();
    // Nothing to contact before the thread is known.
    expect(screen.queryByTestId('venue-chat-contact-open')).toBeNull();
    fireEvent.press(screen.getByText('Go back'));
    expect(mockGoBack).toHaveBeenCalled();

    const { chat } = mount(chatState({ room: null, loadFailed: true }));
    expect(screen.getByTestId('venue-chat-failed')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Try again'));
    expect(chat.reload).toHaveBeenCalled();
    // Nothing joins before the thread is known.
    expect(socketHook).toHaveBeenLastCalledWith(expect.objectContaining({ podId: null }));
  });
});
