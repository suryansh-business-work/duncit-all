import { fireEvent, screen } from '@testing-library/react-native';

import { PostDetailScreen } from '@/screens/PostDetailScreen';
import { useProfile } from '@/hooks/useProfile';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useProfile', () => ({ useProfile: jest.fn() }));
jest.mock('@/components/profile/post-viewer/PostViewerSheet', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text } = require('react-native');
  return {
    PostViewerSheet: ({
      postId,
      meId,
      onClose,
      onDeleted,
    }: {
      postId: string;
      meId?: string;
      onClose: () => void;
      onDeleted: () => void;
    }) => (
      <Pressable testID="viewer" onPress={onClose} onLongPress={onDeleted}>
        <Text>{`${postId}:${meId ?? 'anon'}`}</Text>
      </Pressable>
    ),
  };
});

const mockGoBack = jest.fn();
let mockRouteParams: { postId: string } | undefined = { postId: 'p1' };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: mockRouteParams }),
}));

const mockedProfile = useProfile as jest.Mock;

beforeEach(() => {
  mockGoBack.mockClear();
  mockRouteParams = { postId: 'p1' };
  mockedProfile.mockReturnValue({ me: { user_id: 'me' } });
});

describe('PostDetailScreen', () => {
  it('opens the post viewer on the routed post with the viewer id', () => {
    renderWithProviders(<PostDetailScreen />);
    expect(screen.getByText('p1:me')).toBeOnTheScreen();
  });

  it('goes back on close and on delete', () => {
    renderWithProviders(<PostDetailScreen />);
    fireEvent.press(screen.getByTestId('viewer'));
    fireEvent(screen.getByTestId('viewer'), 'longPress');
    expect(mockGoBack).toHaveBeenCalledTimes(2);
  });

  it('falls back to an anonymous viewer when the profile is not loaded', () => {
    mockedProfile.mockReturnValue({ me: null });
    renderWithProviders(<PostDetailScreen />);
    expect(screen.getByText('p1:anon')).toBeOnTheScreen();
  });

  it('falls back to an empty post id when route params are missing', () => {
    mockRouteParams = undefined;
    renderWithProviders(<PostDetailScreen />);
    expect(screen.getByText(':me')).toBeOnTheScreen();
  });
});
