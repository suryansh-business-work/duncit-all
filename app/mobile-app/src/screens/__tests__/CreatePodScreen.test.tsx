import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { CreatePodScreen } from '@/screens/CreatePodScreen';
import { useCreatePod } from '@/hooks/useCreatePod';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, replace: mockReplace, goBack: jest.fn() }),
  useRoute: () => ({ params: { draftId: 'd1' } }),
}));
jest.mock('@/hooks/useCreatePod', () => ({ useCreatePod: jest.fn() }));
const mockFetch = jest.fn();
jest.mock('@/stores/home.store', () => ({
  useHomeStore: { getState: () => ({ fetch: mockFetch }) },
}));
// The stepper is covered in its own spec; stub it to drive the screen's publish flow.
jest.mock('@/components/create-pod', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text } = require('react-native');
  return {
    CreatePodStepper: ({
      onPublish,
    }: {
      onPublish: (id: string, input: unknown) => Promise<void>;
    }) => (
      <Pressable testID="mock-publish" onPress={() => void onPublish('draft-1', {})}>
        <Text>publish</Text>
      </Pressable>
    ),
  };
});

const mockedUse = useCreatePod as jest.Mock;

const api = (over: Record<string, unknown> = {}) => ({
  isApprovedHost: true,
  clubs: [],
  venues: [],
  products: [],
  isLoading: false,
  initialValues: {},
  initialStep: 0,
  initialDraftId: 'd1',
  saveDraft: jest.fn().mockResolvedValue('d1'),
  publish: jest.fn().mockResolvedValue(undefined),
  ...over,
});

beforeEach(() => jest.clearAllMocks());

describe('CreatePodScreen', () => {
  it('shows the loading spinner while options load', () => {
    mockedUse.mockReturnValue(api({ isLoading: true }));
    renderWithProviders(<CreatePodScreen />);
    expect(screen.getByTestId('create-pod-loading')).toBeOnTheScreen();
  });

  it('gates non-hosts with a become-a-host CTA', () => {
    mockedUse.mockReturnValue(api({ isApprovedHost: false }));
    renderWithProviders(<CreatePodScreen />);
    expect(screen.getByTestId('create-pod-not-host')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('create-pod-become-host'));
    expect(mockNavigate).toHaveBeenCalledWith('BecomeHost');
  });

  it('publishes, refreshes the feed and lands on Hosts Management', async () => {
    const screenApi = api();
    mockedUse.mockReturnValue(screenApi);
    renderWithProviders(<CreatePodScreen />);
    fireEvent.press(screen.getByTestId('mock-publish'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('HostManage'));
    expect(screenApi.publish).toHaveBeenCalledWith('draft-1', {});
    expect(mockFetch).toHaveBeenCalledWith(true);
  });
});
