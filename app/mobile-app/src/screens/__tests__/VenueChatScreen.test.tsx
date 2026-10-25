import { act, fireEvent, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { VenueChatSide } from '@/generated/graphql/graphql';
import { useChatImagePicker } from '@/hooks/useChatImagePicker';
import { useMe } from '@/hooks/useMe';
import { useVenueChat, type VenueChatRoom } from '@/hooks/useVenueChat';
import { useVenueChatSocket } from '@/hooks/useVenueChatSocket';
import { useOfferCards } from '@/components/venue-chat/useOfferCards';
import { VenueChatScreen } from '@/screens/VenueChatScreen';
import { renderWithProviders } from '@/utils/test-utils';
import { offerMove } from '@/utils/venue-offer-fixture';

jest.mock('@/hooks/useVenueChat', () => ({ useVenueChat: jest.fn() }));
jest.mock('@/hooks/useVenueChatSocket', () => ({ useVenueChatSocket: jest.fn() }));
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
const cardsHook = useOfferCards as jest.Mock;
const pickImage = jest.fn(() => Promise.resolve());

const room = (side = VenueChatSide.Host): VenueChatRoom => ({
  pod_id: 'pod-1',
  pod_title: 'Sunday Badminton',
  pod_date_time: null,
  venue_id: 'venue-1',
  venue_name: 'Court House',
  venue_photo: null,
  my_side: side,
  pod_is_free: false,
  counterpart_name: 'Asha Rao',
  counterpart_phone: '+91 9000000001',
  counterpart_email: null,
});

const chatState = (over: Record<string, unknown> = {}) => ({
  room: room(),
  messages: [],
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
  sendText: jest.fn(() => Promise.resolve(true)),
  sendImage: jest.fn(),
  ...over,
});

const cardsState = (over: Record<string, unknown> = {}) => ({
  renderMessage: jest.fn(() => null),
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

beforeEach(() => {
  jest.clearAllMocks();
  mockCanGoBack = true;
  (useMe as jest.Mock).mockReturnValue({ data: { me: { user_id: 'u1' } } });
  (useChatImagePicker as jest.Mock).mockReturnValue(pickImage);
});

describe('VenueChatScreen', () => {
  it('opens the thread with the other side, how to reach them, and the offer cards wired in', () => {
    const { chat, cards } = mount();
    expect(screen.getByTestId('venue-chat-title')).toHaveTextContent('Court House');
    expect(screen.getByTestId('venue-chat-contact-phone')).toBeOnTheScreen();
    expect(screen.getByText('Start the conversation with the venue')).toBeOnTheScreen();
    // The thread's offers ride on its own lines, read once the first page is in.
    expect(cardsHook).toHaveBeenCalledWith('pod-1', chat.room, chat.messages, true);
    expect(socketHook).toHaveBeenCalledWith(expect.objectContaining({ podId: 'pod-1' }));
    expect(screen.getByTestId('resubmit-stub')).toHaveTextContent('none');
    expect(cards.renderMessage).not.toHaveBeenCalled();
  });

  it('feeds socket lines in and names a refused join', () => {
    const { chat } = mount();
    const handlers = socketHook.mock.calls[0][0];
    const line = { id: 'l1' };
    handlers.onLine(line);
    expect(chat.addLines).toHaveBeenCalledWith([line]);
    handlers.onJoinFailed('FORBIDDEN');
    expect(chat.setError).toHaveBeenCalledWith(
      "This chat is not available. Only this pod's hosts and its venue can open it.",
    );
    handlers.onJoinFailed('ERROR');
    expect(chat.setError).toHaveBeenCalledWith(
      'Live updates are paused. New messages show when you reopen the chat.',
    );
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
    mount(chatState({ room: room(VenueChatSide.Venue) }));
    expect(screen.getByText('Start the conversation with the host')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('venue-chat-back'));
    expect(mockNavigate).toHaveBeenCalledWith('VenuePods');
  });

  it('closes a thread that is not the reader’s, and retries one that failed to load', () => {
    mount(chatState({ room: null, unavailable: true, loadFailed: true }));
    expect(screen.getByTestId('venue-chat-unavailable')).toBeOnTheScreen();
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
