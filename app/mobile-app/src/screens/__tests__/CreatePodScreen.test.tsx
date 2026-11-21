import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { isPodDraftId, type DraftAutosaveHandle } from '@duncit/utils';

import { CreatePodScreen } from '@/screens/CreatePodScreen';
import { useCreatePod } from '@/hooks/useCreatePod';
import { renderWithProviders } from '@/utils/test-utils';

const DRAFT_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockSetParams = jest.fn();
const mockDispatch = jest.fn();
const mockNavigation = {
  canGoBack: () => true,
  navigate: mockNavigate,
  replace: mockReplace,
  goBack: jest.fn(),
  setParams: mockSetParams,
  dispatch: mockDispatch,
};
const mockRoute: { params: Record<string, string | undefined> | undefined } = {
  params: { draftId: DRAFT_ID },
};
/** What the leave guard last asked react-navigation for. */
const mockPrevent: {
  on: boolean;
  callback: (options: { data: { action: { type: string } } }) => void;
} = { on: false, callback: () => undefined };
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => mockRoute,
  usePreventRemove: (
    on: boolean,
    callback: (options: { data: { action: { type: string } } }) => void,
  ) => {
    mockPrevent.on = on;
    mockPrevent.callback = callback;
  },
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => '0123abcd-ef45-4678-9abc-def012345678' }));
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
      onAutosave,
    }: {
      onPublish: (id: string, input: unknown) => Promise<void>;
      onAutosave: (handle: DraftAutosaveHandle) => void;
    }) => {
      mockStepper.onAutosave = onAutosave;
      return (
        <Pressable testID="mock-publish" onPress={() => void onPublish('draft-1', {})}>
          <Text>publish</Text>
        </Pressable>
      );
    },
  };
});
const mockStepper: { onAutosave: (handle: DraftAutosaveHandle) => void } = {
  onAutosave: () => undefined,
};
const report = (handle: DraftAutosaveHandle) =>
  act(() => {
    mockStepper.onAutosave(handle);
  });
const BACK = { type: 'GO_BACK' };

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

beforeEach(() => {
  jest.clearAllMocks();
  mockRoute.params = { draftId: DRAFT_ID };
});

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

  describe('draft id', () => {
    it('resumes the draft named in the route, leaving the params as they are', () => {
      mockedUse.mockReturnValue(api());
      renderWithProviders(<CreatePodScreen />);
      expect(mockedUse).toHaveBeenCalledWith(DRAFT_ID, undefined, undefined);
      expect(mockSetParams).not.toHaveBeenCalled();
    });

    it('mints an id for a new pod and writes it into the route at once, keeping its prefill params', () => {
      mockRoute.params = { hostAgainPodId: 'pod-7' };
      mockedUse.mockReturnValue(api());
      renderWithProviders(<CreatePodScreen />);
      const minted = mockedUse.mock.calls[0]?.[0];
      expect(isPodDraftId(minted)).toBe(true);
      expect(minted.slice(8)).toBe('0123abcdef45678a');
      expect(mockedUse).toHaveBeenCalledWith(minted, undefined, 'pod-7');
      expect(mockSetParams).toHaveBeenCalledWith({ draftId: minted });
    });

    it('replaces a route id that is not a draft id', () => {
      mockRoute.params = { draftId: 'd1' };
      mockedUse.mockReturnValue(api());
      renderWithProviders(<CreatePodScreen />);
      expect(isPodDraftId(mockedUse.mock.calls[0]?.[0])).toBe(true);
      expect(mockSetParams).toHaveBeenCalled();
    });
  });

  it('opens no form when the draft cannot be read, and retries on request', () => {
    const retry = jest.fn();
    mockedUse.mockReturnValue(api({ loadFailed: true, isHost: false, retry }));
    renderWithProviders(<CreatePodScreen />);
    expect(screen.getByTestId('create-pod-load-failed')).toHaveTextContent(
      'Could not open this draft. Check your connection and try again.',
    );
    expect(screen.queryByTestId('mock-publish')).toBeNull();
    // Not mistaken for a host without access.
    expect(screen.queryByTestId('create-pod-not-host')).toBeNull();
    fireEvent.press(screen.getByTestId('create-pod-load-retry'));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('shows the save state the stepper reports in the header corner', () => {
    mockedUse.mockReturnValue(api());
    renderWithProviders(<CreatePodScreen />);
    expect(screen.queryByTestId('draft-save-indicator')).toBeNull();
    const flush = jest.fn().mockResolvedValue(true);
    report({ status: 'saving', unsaved: true, flush });
    expect(
      within(screen.getByTestId('draft-save-indicator')).getByText('Saving…'),
    ).toBeOnTheScreen();
    report({ status: 'saved', unsaved: false, flush });
    expect(within(screen.getByTestId('draft-save-indicator')).getByText('Saved')).toBeOnTheScreen();
    report({ status: 'error', unsaved: true, flush });
    expect(
      within(screen.getByTestId('draft-save-indicator')).getByText('Not saved — retrying'),
    ).toBeOnTheScreen();
  });

  describe('leaving', () => {
    it('only holds the way out while something is unsaved', () => {
      mockedUse.mockReturnValue(api());
      renderWithProviders(<CreatePodScreen />);
      expect(mockPrevent.on).toBe(false);
      report({ status: 'saved', unsaved: true, flush: jest.fn() });
      expect(mockPrevent.on).toBe(true);
      report({ status: 'saved', unsaved: false, flush: jest.fn() });
      expect(mockPrevent.on).toBe(false);
    });

    it('saves first, then leaves', async () => {
      mockedUse.mockReturnValue(api());
      renderWithProviders(<CreatePodScreen />);
      const flush = jest.fn().mockResolvedValue(true);
      report({ status: 'saved', unsaved: true, flush });
      act(() => mockPrevent.callback({ data: { action: BACK } }));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(BACK));
      expect(flush).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('Leave without saving?')).toBeNull();
    });

    it('asks when the save fails: Stay keeps the host here, Leave anyway goes', async () => {
      mockedUse.mockReturnValue(api());
      renderWithProviders(<CreatePodScreen />);
      report({ status: 'error', unsaved: true, flush: jest.fn().mockResolvedValue(false) });
      act(() => mockPrevent.callback({ data: { action: BACK } }));
      expect(await screen.findByText('Leave without saving?')).toBeOnTheScreen();
      fireEvent.press(screen.getByTestId('create-pod-leave-cancel'));
      await waitFor(() => expect(screen.queryByText('Leave without saving?')).toBeNull());
      expect(mockDispatch).not.toHaveBeenCalled();

      act(() => mockPrevent.callback({ data: { action: BACK } }));
      fireEvent.press(await screen.findByTestId('create-pod-leave-confirm'));
      expect(mockDispatch).toHaveBeenCalledWith(BACK);
    });
  });
});
