import { fireEvent, screen } from '@testing-library/react-native';

import { ChatRoomScreen } from '@/screens/ChatRoomScreen';
import { usePodMessages } from '@/hooks/useChat';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useChat', () => ({ usePodMessages: jest.fn() }));
jest.mock('@/hooks/useMe', () => ({ useMe: () => ({ data: { me: { user_id: 'me1' } } }) }));

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: { podId: 'pod1', title: 'Coffee Chat' } }),
}));

const mockedMessages = usePodMessages as jest.Mock;

const message = (id: string, userId: string, text: string) =>
  ({
    id,
    user_id: userId,
    user_name: 'Asha',
    user_photo: null,
    type: 'TEXT',
    text,
    image_url: null,
    createdAt: '2026-06-09T10:00:00.000Z',
  }) as never;

beforeEach(() => mockGoBack.mockClear());

describe('ChatRoomScreen', () => {
  it('shows the spinner while loading', () => {
    mockedMessages.mockReturnValue({ messages: [], isLoading: true });
    renderWithProviders(<ChatRoomScreen />);
    expect(screen.getByTestId('chat-room-loading')).toBeOnTheScreen();
  });

  it('shows the empty state and the room title', () => {
    mockedMessages.mockReturnValue({ messages: [], isLoading: false });
    renderWithProviders(<ChatRoomScreen />);
    expect(screen.getByText('Coffee Chat')).toBeOnTheScreen();
    expect(screen.getByTestId('chat-room-empty')).toBeOnTheScreen();
  });

  it('renders my and others messages, and goes back', () => {
    mockedMessages.mockReturnValue({
      messages: [message('m1', 'me1', 'hi'), message('m2', 'u2', 'yo')],
      isLoading: false,
    });
    renderWithProviders(<ChatRoomScreen />);
    expect(screen.getByTestId('chat-message-m1')).toBeOnTheScreen();
    expect(screen.getByTestId('chat-message-m2')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('chat-room-back'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});
