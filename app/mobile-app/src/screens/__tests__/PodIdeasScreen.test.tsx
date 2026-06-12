import { Share } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { PodIdeasScreen } from '@/screens/PodIdeasScreen';
import { usePodIdeas } from '@/hooks/usePodIdeas';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/usePodIdeas', () => ({ usePodIdeas: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: jest.fn(), navigate: jest.fn() }),
}));

// Lightweight stand-ins so the screen's own handlers are what we exercise.
jest.mock('@/components/pod-ideas', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, Text, Pressable } = require('react-native');
  return {
    IdeasList: ({
      onOpen,
      onLike,
      onShare,
      onDelete,
    }: {
      onOpen: (id: string) => void;
      onLike: (id: string) => void;
      onShare: (idea: { id: string; title: string; description: string }) => void;
      onDelete: (id: string) => void;
    }) => (
      <View>
        <Pressable testID="mock-open" onPress={() => onOpen('idea-1')}>
          <Text>open</Text>
        </Pressable>
        <Pressable testID="mock-like" onPress={() => onLike('idea-1')}>
          <Text>like</Text>
        </Pressable>
        <Pressable
          testID="mock-share"
          onPress={() => onShare({ id: 'idea-1', title: 'T', description: 'D' })}
        >
          <Text>share</Text>
        </Pressable>
        <Pressable testID="mock-delete" onPress={() => onDelete('idea-1')}>
          <Text>del</Text>
        </Pressable>
      </View>
    ),
    IdeaComposerSheet: ({
      open,
      onClose,
      onSubmit,
    }: {
      open: boolean;
      onClose: () => void;
      onSubmit: (a: string, b: string) => void;
    }) =>
      open ? (
        <View>
          <Pressable testID="mock-composer-submit" onPress={() => onSubmit('NT', 'ND')}>
            <Text>composer</Text>
          </Pressable>
          <Pressable testID="mock-composer-close" onPress={onClose}>
            <Text>close</Text>
          </Pressable>
        </View>
      ) : null,
    IdeaDetailsSheet: ({ id, onClose }: { id: string; onClose: () => void }) => (
      <Pressable testID="mock-details-close" onPress={onClose}>
        <Text>details {id}</Text>
      </Pressable>
    ),
    IdeaDeleteConfirm: ({
      open,
      onCancel,
      onConfirm,
    }: {
      open: boolean;
      onCancel: () => void;
      onConfirm: () => void;
    }) =>
      open ? (
        <View>
          <Pressable testID="mock-confirm-yes" onPress={onConfirm}>
            <Text>confirm</Text>
          </Pressable>
          <Pressable testID="mock-confirm-no" onPress={onCancel}>
            <Text>cancel</Text>
          </Pressable>
        </View>
      ) : null,
  };
});

const mockedUse = usePodIdeas as jest.Mock;

const makeApi = () => ({
  ideas: [],
  myIdeas: [],
  myId: 'me',
  hasData: true,
  isLoading: false,
  refetch: jest.fn(),
  create: jest.fn().mockResolvedValue(undefined),
  toggleLike: jest.fn(),
  share: jest.fn().mockResolvedValue(undefined),
  deleteIdea: jest.fn().mockResolvedValue(undefined),
});

let api: ReturnType<typeof makeApi>;
beforeEach(() => {
  api = makeApi();
  mockedUse.mockReturnValue(api);
});

describe('PodIdeasScreen', () => {
  it('opens the composer, submits a new idea, and closes it', () => {
    renderWithProviders(<PodIdeasScreen />);
    fireEvent.press(screen.getByTestId('pod-ideas-add'));
    fireEvent.press(screen.getByTestId('mock-composer-submit'));
    expect(api.create).toHaveBeenCalledWith('NT', 'ND');
    fireEvent.press(screen.getByTestId('mock-composer-close'));
    expect(screen.queryByTestId('mock-composer-submit')).toBeNull();
  });

  it('updates the search field and likes an idea', () => {
    renderWithProviders(<PodIdeasScreen />);
    fireEvent.changeText(screen.getByTestId('pod-ideas-search'), 'jam');
    fireEvent.press(screen.getByTestId('mock-like'));
    expect(api.toggleLike).toHaveBeenCalledWith('idea-1');
  });

  it('shares an idea via the native share sheet then records the share', async () => {
    const spy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);
    renderWithProviders(<PodIdeasScreen />);
    fireEvent.press(screen.getByTestId('mock-share'));
    await waitFor(() => expect(api.share).toHaveBeenCalledWith('idea-1'));
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('swallows a cancelled share', async () => {
    const spy = jest.spyOn(Share, 'share').mockRejectedValue(new Error('cancelled'));
    renderWithProviders(<PodIdeasScreen />);
    fireEvent.press(screen.getByTestId('mock-share'));
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(api.share).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('opens then closes the details sheet', () => {
    renderWithProviders(<PodIdeasScreen />);
    fireEvent.press(screen.getByTestId('mock-open'));
    expect(screen.getByText('details idea-1')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('mock-details-close'));
    expect(screen.queryByText('details idea-1')).toBeNull();
  });

  it('confirms a delete', async () => {
    renderWithProviders(<PodIdeasScreen />);
    fireEvent.press(screen.getByTestId('mock-delete'));
    fireEvent.press(screen.getByTestId('mock-confirm-yes'));
    await waitFor(() => expect(api.deleteIdea).toHaveBeenCalledWith('idea-1'));
  });

  it('cancels a delete', () => {
    renderWithProviders(<PodIdeasScreen />);
    fireEvent.press(screen.getByTestId('mock-delete'));
    fireEvent.press(screen.getByTestId('mock-confirm-no'));
    expect(screen.queryByTestId('mock-confirm-yes')).toBeNull();
    expect(api.deleteIdea).not.toHaveBeenCalled();
  });

  it('keeps the confirm open when the delete fails', async () => {
    api.deleteIdea.mockRejectedValueOnce(new Error('boom'));
    renderWithProviders(<PodIdeasScreen />);
    fireEvent.press(screen.getByTestId('mock-delete'));
    fireEvent.press(screen.getByTestId('mock-confirm-yes'));
    await waitFor(() => expect(api.deleteIdea).toHaveBeenCalled());
    expect(screen.getByTestId('mock-confirm-yes')).toBeOnTheScreen();
  });
});
