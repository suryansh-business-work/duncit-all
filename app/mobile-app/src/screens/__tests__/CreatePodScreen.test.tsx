import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { CreatePodScreen } from '@/screens/CreatePodScreen';
import { useCreatePod } from '@/hooks/useCreatePod';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    canGoBack: () => true,
    navigate: mockNavigate,
    replace: mockReplace,
    goBack: jest.fn(),
  }),
  useRoute: () => ({ params: { draftId: 'd1' } }),
}));
jest.mock('@/hooks/useCreatePod', () => ({ useCreatePod: jest.fn() }));
// Whether the pod's category requires a challenge is a server answer; each
// test says which one it is exercising.
const mockChallengeRequired = jest.fn().mockResolvedValue(false);
jest.mock('@/services/challenge-setup', () => ({
  challengeRequired: (podId: string) => mockChallengeRequired(podId),
}));
const mockFetch = jest.fn().mockResolvedValue(undefined);
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
  isHost: true,
  clubs: [],
  venues: [],
  products: [],
  isLoading: false,
  initialValues: {},
  initialStep: 0,
  initialDraftId: 'd1',
  saveDraft: jest.fn().mockResolvedValue('d1'),
  moderate: jest.fn().mockResolvedValue({ allowed: true, violations: [] }),
  publish: jest.fn().mockResolvedValue({ id: 'pod-1', venue_approval_status: 'NONE' }),
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
    mockedUse.mockReturnValue(api({ isHost: false }));
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

  it('lands on the pod’s Challenges screen when its category requires a challenge', async () => {
    mockChallengeRequired.mockResolvedValueOnce(true);
    const screenApi = api({
      publish: jest.fn().mockResolvedValue({ id: 'pod-9', venue_approval_status: 'NONE' }),
    });
    mockedUse.mockReturnValue(screenApi);
    renderWithProviders(<CreatePodScreen />);
    fireEvent.press(screen.getByTestId('mock-publish'));
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('HostPodChallenges', { podId: 'pod-9' }),
    );
    expect(mockChallengeRequired).toHaveBeenCalledWith('pod-9');
    expect(mockReplace).not.toHaveBeenCalledWith('HostManage');
  });

  it('lands on the waiting screen when the venue slot request is PENDING', async () => {
    const screenApi = api({
      publish: jest.fn().mockResolvedValue({ id: 'pod-2', venue_approval_status: 'PENDING' }),
    });
    mockedUse.mockReturnValue(screenApi);
    renderWithProviders(<CreatePodScreen />);
    fireEvent.press(screen.getByTestId('mock-publish'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('PodPending', { podId: 'pod-2' }));
    expect(mockFetch).toHaveBeenCalledWith(true);
  });
});
