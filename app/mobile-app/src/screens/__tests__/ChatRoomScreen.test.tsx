import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { ChatRoomScreen } from '@/screens/ChatRoomScreen';
import { useChatRoom } from '@/hooks/useChatRoom';
import { useChatParticipants } from '@/hooks/useChat';
import { useMe } from '@/hooks/useMe';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useChatRoom', () => ({ useChatRoom: jest.fn() }));
jest.mock('@/hooks/useChat', () => ({ useChatParticipants: jest.fn() }));
jest.mock('@/hooks/useMe', () => ({ useMe: jest.fn() }));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const mockPopTo = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ popTo: mockPopTo, navigate: mockNavigate }),
  useRoute: () => ({ params: { podId: 'p1', title: 'Coffee Chat' } }),
}));

const hook = useChatRoom as jest.Mock;
const participantsHook = useChatParticipants as jest.Mock;
const meHook = useMe as jest.Mock;
const reqPerm = ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock;
const launch = ImagePicker.launchImageLibraryAsync as jest.Mock;

const message = (id: string, userId: string) =>
  ({
    id,
    pod_id: 'p1',
    user_id: userId,
    user_name: 'Asha',
    user_photo: null,
    type: 'TEXT',
    text: `msg-${id}`,
    image_url: null,
    reactions: [],
    deleted: false,
    createdAt: '2026-06-09T10:00:00.000Z',
  }) as never;

const historyStub = (over: Record<string, unknown> = {}) => ({
  hasOlder: false,
  loadingOlder: false,
  olderFailed: false,
  startHistory: jest.fn(),
  loadOlder: jest.fn().mockResolvedValue(undefined),
  onScroll: jest.fn(),
  ...over,
});

function roomValue(over: Record<string, unknown>, actions: Record<string, unknown>) {
  return {
    messages: [],
    isLoading: false,
    sending: false,
    error: null,
    history: historyStub(),
    ...actions,
    ...over,
  };
}

function mount(over: Record<string, unknown> = {}) {
  const actions = {
    sendText: jest.fn().mockResolvedValue(true),
    sendImage: jest.fn().mockResolvedValue(undefined),
    react: jest.fn().mockResolvedValue(undefined),
    setError: jest.fn(),
  };
  hook.mockReturnValue(roomValue(over, actions));
  const view = renderWithProviders(<ChatRoomScreen />);
  /** Re-renders the screen with the room hook now answering `next`. */
  const rerenderWith = (next: Record<string, unknown>) => {
    hook.mockReturnValue(roomValue(next, actions));
    view.rerender(<ChatRoomScreen />);
  };
  return { ...actions, rerenderWith };
}

beforeEach(() => {
  mockPopTo.mockClear();
  mockNavigate.mockClear();
  reqPerm.mockReset();
  launch.mockReset();
  meHook.mockReturnValue({ data: { me: { user_id: 'me1' } } });
  participantsHook.mockReturnValue({ hosts: [], participants: [], count: 0, isLoading: false });
});

describe('ChatRoomScreen', () => {
  it('shows the loading skeleton', () => {
    mount({ isLoading: true });
    expect(screen.getByTestId('chat-room-loading')).toBeOnTheScreen();
  });

  it('shows the empty state and the room title', () => {
    mount();
    expect(screen.getByText('Coffee Chat')).toBeOnTheScreen();
    expect(screen.getByTestId('chat-room-empty')).toBeOnTheScreen();
  });

  it('renders messages and navigates back to the pod details', () => {
    mount({ messages: [message('m1', 'me1'), message('m2', 'u2')] });
    expect(screen.getByTestId('chat-message-m1')).toBeOnTheScreen();
    expect(screen.getByTestId('chat-message-m2')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('chat-room-back'));
    expect(mockPopTo).toHaveBeenCalledWith('PodDetails', { podId: 'p1', title: 'Coffee Chat' });
  });

  it('dismisses the error banner', () => {
    const actions = mount({ error: 'boom' });
    fireEvent.press(screen.getByTestId('chat-room-error'));
    expect(actions.setError).toHaveBeenCalledWith(null);
  });

  it('sends typed text then clears the input', async () => {
    const actions = mount();
    fireEvent.changeText(screen.getByTestId('chat-input'), 'hello');
    fireEvent.press(screen.getByTestId('chat-send'));
    expect(actions.sendText).toHaveBeenCalledWith('hello', { replyToId: null, mentions: [] });
    await waitFor(() => expect(screen.getByTestId('chat-input').props.value).toBe(''));
  });

  it('keeps the text when the send fails, so nothing typed is lost', async () => {
    const actions = mount();
    actions.sendText.mockResolvedValue(false);
    fireEvent.changeText(screen.getByTestId('chat-input'), 'hello');
    fireEvent.press(screen.getByTestId('chat-send'));
    await waitFor(() => expect(actions.sendText).toHaveBeenCalled());
    expect(screen.getByTestId('chat-input').props.value).toBe('hello');
  });

  it('replies from the long-press menu: quotes the line and sends its id', async () => {
    const actions = mount({ messages: [message('m2', 'u2')] });
    fireEvent(screen.getByTestId('chat-message-m2'), 'longPress');
    fireEvent.press(await screen.findByTestId('chat-message-action-reply'));
    expect(screen.getByText('Replying to Asha')).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('chat-input'), 'yes');
    fireEvent.press(screen.getByTestId('chat-send'));
    expect(actions.sendText).toHaveBeenCalledWith('yes', { replyToId: 'm2', mentions: [] });
    await waitFor(() => expect(screen.queryByTestId('chat-reply-strip')).toBeNull());
  });

  it('offers no Reply once the pod has ended', () => {
    mount({ messages: [message('m2', 'u2')], podEnded: true });
    fireEvent(screen.getByTestId('chat-message-m2'), 'longPress');
    expect(screen.queryByTestId('chat-message-action-reply')).toBeNull();
  });

  it('suggests pod members after @, inserts the pick and sends the mention', async () => {
    participantsHook.mockReturnValue({
      hosts: [{ user_id: 'h1', full_name: 'Alice Host', profile_photo: null }],
      participants: [{ user_id: 'me1', full_name: 'Me Myself', profile_photo: null }],
      count: 1,
      isLoading: false,
    });
    const actions = mount();
    const input = screen.getByTestId('chat-input');
    fireEvent.changeText(input, 'hi @Al');
    fireEvent(input, 'selectionChange', { nativeEvent: { selection: { start: 6, end: 6 } } });
    // The writer is never offered to themselves.
    expect(screen.queryByTestId('chat-mention-option-me1')).toBeNull();
    fireEvent.press(screen.getByTestId('chat-mention-option-h1'));
    expect(screen.getByTestId('chat-input').props.value).toBe('hi @Alice ');
    fireEvent.press(screen.getByTestId('chat-send'));
    expect(actions.sendText).toHaveBeenCalledWith('hi @Alice', {
      replyToId: null,
      mentions: ['h1'],
    });
  });

  it('mutes the room from the header bell', () => {
    mount();
    fireEvent.press(screen.getByTestId('chat-mute-toggle'));
    expect(screen.getByTestId('chat-mute-EIGHT_HOURS')).toBeOnTheScreen();
  });

  it('inserts an emoji into the composer', () => {
    mount();
    fireEvent.press(screen.getByTestId('chat-emoji-toggle'));
    fireEvent.press(screen.getByTestId('emoji-👍'));
    expect(screen.getByTestId('chat-input').props.value).toBe('👍');
    expect(screen.queryByTestId('emoji-bar')).toBeNull();
  });

  it('toggles the emoji bar closed again', () => {
    mount();
    fireEvent.press(screen.getByTestId('chat-emoji-toggle'));
    expect(screen.getByTestId('emoji-bar')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('chat-emoji-toggle'));
    expect(screen.queryByTestId('emoji-bar')).toBeNull();
  });

  it('reacts to a message from its long-press actions', () => {
    const actions = mount({ messages: [message('m2', 'u2')] });
    fireEvent(screen.getByTestId('chat-message-m2'), 'longPress');
    // Long-press opens the message's actions; React opens the emoji picker.
    fireEvent.press(screen.getByTestId('chat-message-action-react'));
    fireEvent.press(screen.getByTestId('emoji-👍'));
    expect(actions.react).toHaveBeenCalledWith('m2', '👍');
  });

  it('warns when photo permission is denied', async () => {
    const actions = mount();
    reqPerm.mockResolvedValue({ granted: false });
    fireEvent.press(screen.getByTestId('chat-pick-image'));
    await waitFor(() => expect(actions.setError).toHaveBeenCalled());
    expect(actions.sendImage).not.toHaveBeenCalled();
  });

  it('does nothing when image picking is cancelled', async () => {
    const actions = mount();
    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValue({ canceled: true });
    fireEvent.press(screen.getByTestId('chat-pick-image'));
    await waitFor(() => expect(launch).toHaveBeenCalled());
    expect(actions.sendImage).not.toHaveBeenCalled();
  });

  it('ignores an empty asset list', async () => {
    const actions = mount();
    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValue({ canceled: false, assets: [] });
    fireEvent.press(screen.getByTestId('chat-pick-image'));
    await waitFor(() => expect(launch).toHaveBeenCalled());
    expect(actions.sendImage).not.toHaveBeenCalled();
  });

  it('sends a picked image', async () => {
    const actions = mount();
    reqPerm.mockResolvedValue({ granted: true });
    launch.mockResolvedValue({
      canceled: false,
      assets: [{ base64: 'b', fileName: 'f.jpg', mimeType: 'image/png' }],
    });
    fireEvent.press(screen.getByTestId('chat-pick-image'));
    await waitFor(() => expect(actions.sendImage).toHaveBeenCalled());
    expect(actions.sendImage).toHaveBeenCalledWith({
      base64: 'b',
      fileName: 'f.jpg',
      mimeType: 'image/png',
    });
  });

  it('treats a user with no profile as not-mine', () => {
    meHook.mockReturnValue({ data: undefined });
    mount({ messages: [message('m1', 'u2')] });
    expect(screen.getByTestId('chat-message-m1')).toBeOnTheScreen();
  });

  it('replaces the composer with a closed notice once the pod has ended', () => {
    mount({ podEnded: true });
    expect(screen.getByTestId('chat-closed-notice')).toBeOnTheScreen();
    expect(screen.queryByTestId('chat-input')).toBeNull();
  });

  it('opens the linked pod detail from the header title', () => {
    mount();
    fireEvent.press(screen.getByTestId('chat-room-title'));
    expect(mockNavigate).toHaveBeenCalledWith('PodDetails', { podId: 'p1', title: 'Coffee Chat' });
  });

  describe('scroll-up history', () => {
    const scrollToEnd = ScrollView.prototype.scrollToEnd as unknown as jest.Mock;
    beforeEach(() => scrollToEnd.mockClear());

    it('follows a new newest line to the bottom, but not an older page put on top', () => {
      const first = [message('m2', 'u2'), message('m3', 'me1')];
      const { rerenderWith } = mount({ messages: first });
      expect(scrollToEnd).toHaveBeenCalledTimes(1);

      // An older page lands in front: the newest line is unchanged, so the reader stays put.
      rerenderWith({ messages: [message('m0', 'u2'), message('m1', 'u2'), ...first] });
      expect(screen.getByTestId('chat-message-m0')).toBeOnTheScreen();
      expect(scrollToEnd).toHaveBeenCalledTimes(1);

      // A live line (or your own send) is the new newest line: follow it.
      rerenderWith({ messages: [message('m0', 'u2'), ...first, message('m4', 'u2')] });
      expect(scrollToEnd).toHaveBeenCalledTimes(2);
    });

    it('hands the list scroll to the history and keeps the reader in place on a prepend', () => {
      const history = historyStub({ hasOlder: true });
      mount({ messages: [message('m1', 'u2')], history });
      const list = screen.getByTestId('chat-room-list');
      expect(list).toHaveProp('maintainVisibleContentPosition', { minIndexForVisible: 0 });
      fireEvent.scroll(list, { nativeEvent: { contentOffset: { y: 40 } } });
      expect(history.onScroll).toHaveBeenCalledTimes(1);
    });

    it('offers earlier messages at the top, and shows a spinner while they load', () => {
      const history = historyStub({ hasOlder: true });
      const { rerenderWith } = mount({ messages: [message('m1', 'u2')], history });
      fireEvent.press(screen.getByTestId('chat-room-earlier'));
      expect(history.loadOlder).toHaveBeenCalledTimes(1);

      rerenderWith({
        messages: [message('m1', 'u2')],
        history: historyStub({ hasOlder: true, loadingOlder: true }),
      });
      expect(screen.getByTestId('chat-room-loading-earlier')).toBeOnTheScreen();
      expect(screen.queryByTestId('chat-room-earlier')).toBeNull();
    });

    it('says when an older page failed and offers it again', () => {
      mount({
        messages: [message('m1', 'u2')],
        history: historyStub({ hasOlder: true, olderFailed: true }),
      });
      expect(screen.getByRole('alert')).toHaveTextContent('The chat could not load.');
      expect(screen.getByTestId('chat-room-earlier')).toBeOnTheScreen();
    });

    it('shows no control once the room’s first line is loaded', () => {
      mount({ messages: [message('m1', 'u2')] });
      expect(screen.queryByTestId('chat-room-earlier')).toBeNull();
      expect(screen.queryByTestId('chat-room-loading-earlier')).toBeNull();
    });
  });

  it('shows host + participants and opens a profile on tap', () => {
    participantsHook.mockReturnValue({
      hosts: [{ user_id: 'h1', full_name: 'Asha Host', profile_photo: null }],
      participants: [{ user_id: 'u2', full_name: 'Ben Guest', profile_photo: 'ben.jpg' }],
      count: 1,
      isLoading: false,
    });
    mount();
    expect(screen.getByTestId('chat-participants')).toBeOnTheScreen();
    expect(screen.getByText('Asha Host')).toBeOnTheScreen();
    expect(screen.getByText('1 participant')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('chat-person-u2'));
    expect(mockNavigate).toHaveBeenCalledWith('PublicProfile', { userId: 'u2' });
  });
});
