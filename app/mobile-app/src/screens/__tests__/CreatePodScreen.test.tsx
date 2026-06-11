import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { CreatePodScreen } from '@/screens/CreatePodScreen';
import { useCreatePod } from '@/hooks/useCreatePod';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, replace: mockReplace, goBack: jest.fn() }),
}));
jest.mock('@/hooks/useCreatePod', () => ({ useCreatePod: jest.fn() }));
const mockFetch = jest.fn();
jest.mock('@/stores/home.store', () => ({
  useHomeStore: { getState: () => ({ fetch: mockFetch }) },
}));
// The form itself is covered in create-pod-form.test; stub it to drive the screen.
jest.mock('@/components/create-pod', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text } = require('react-native');
  return {
    CreatePodFormView: ({ onSubmit }: { onSubmit: (v: unknown) => Promise<void> }) => (
      <Pressable testID="mock-form-submit" onPress={() => void onSubmit({})}>
        <Text>submit</Text>
      </Pressable>
    ),
  };
});

const mockedUse = useCreatePod as jest.Mock;

const api = (over: Record<string, unknown> = {}) => ({
  isApprovedHost: true,
  clubs: [],
  venues: [],
  isLoading: false,
  create: jest.fn().mockResolvedValue('pod-1'),
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

  it('creates a pod, refreshes the feed and lands on Hosts Management', async () => {
    const screenApi = api();
    mockedUse.mockReturnValue(screenApi);
    renderWithProviders(<CreatePodScreen />);
    fireEvent.press(screen.getByTestId('mock-form-submit'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('HostManage'));
    expect(screenApi.create).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(true);
  });
});
