import { fireEvent, screen, waitFor } from '@testing-library/react-native';
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

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: mockGoBack, navigate: mockNavigate }),
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

function mount(over: Record<string, unknown> = {}) {
  const actions = {
    sendText: jest.fn(),
    sendImage: jest.fn().mockResolvedValue(undefined),
    react: jest.fn().mockResolvedValue(undefined),
    setError: jest.fn(),
  };
  hook.mockReturnValue({
    messages: [],
    isLoading: false,
    sending: false,
    error: null,
    ...actions,
    ...over,
  });
  renderWithProviders(<ChatRoomScreen />);
  return actions;
}

beforeEach(() => {
  mockGoBack.mockClear();
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

  it('renders messages and navigates back', () => {
    mount({ messages: [message('m1', 'me1'), message('m2', 'u2')] });
    expect(screen.getByTestId('chat-message-m1')).toBeOnTheScreen();
    expect(screen.getByTestId('chat-message-m2')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('chat-room-back'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('dismisses the error banner', () => {
    const actions = mount({ error: 'boom' });
    fireEvent.press(screen.getByTestId('chat-room-error'));
    expect(actions.setError).toHaveBeenCalledWith(null);
  });

  it('sends typed text then clears the input', () => {
    const actions = mount();
    fireEvent.changeText(screen.getByTestId('chat-input'), 'hello');
    fireEvent.press(screen.getByTestId('chat-send'));
    expect(actions.sendText).toHaveBeenCalledWith('hello');
    expect(screen.getByTestId('chat-input').props.value).toBe('');
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

  it('reacts to a message via long-press', () => {
    const actions = mount({ messages: [message('m2', 'u2')] });
    fireEvent(screen.getByTestId('chat-message-m2'), 'longPress');
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
