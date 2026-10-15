import { fireEvent, screen } from '@testing-library/react-native';

import { ProfilePodsPanel } from '@/components/profile/ProfilePodsPanel';
import { useProfilePods } from '@/hooks/useProfilePods';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useProfilePods', () => ({ useProfilePods: jest.fn() }));
const mockOpenPod = jest.fn();
jest.mock('@/hooks/useDetailNav', () => ({ useDetailNav: () => ({ openPod: mockOpenPod }) }));
// The card is the home feed's (own spec); here it reports the width it was given.
jest.mock('@/components/home/PodCard', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pressable, Text } = require('react-native');
  return {
    PodCard: ({
      pod,
      width,
      onPress,
    }: {
      pod: { id: string };
      width: number;
      onPress: () => void;
    }) => (
      <Pressable testID={`pod-card-${pod.id}`} onPress={onPress}>
        <Text testID={`pod-card-${pod.id}-width`}>{String(width)}</Text>
      </Pressable>
    ),
  };
});
// The card's own states are covered in RequestEventCard.test.
jest.mock('@/components/event-request', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    RequestEventCard: (p: { targetType: string; targetId: string; targetName: string }) => (
      <Text testID="request-event-card">{`${p.targetType}:${p.targetId}:${p.targetName}`}</Text>
    ),
  };
});

const mockPods = useProfilePods as jest.Mock;
const HOUR = 3_600_000;
const upcoming = {
  id: 'p1',
  pod_id: 'POD-1',
  club_slug: 'club-1',
  pod_date_time: new Date(Date.now() + 48 * HOUR).toISOString(),
  pod_end_date_time: new Date(Date.now() + 50 * HOUR).toISOString(),
};
const past = {
  id: 'p0',
  pod_id: 'POD-0',
  club_slug: 'club-1',
  pod_date_time: new Date(Date.now() - 72 * HOUR).toISOString(),
  pod_end_date_time: new Date(Date.now() - 70 * HOUR).toISOString(),
};

const answer = (over: Partial<{ pods: unknown[]; isLoading: boolean; error: unknown }> = {}) =>
  mockPods.mockReturnValue({ pods: [], isLoading: false, error: undefined, ...over });

const layout = (width: number) => ({ nativeEvent: { layout: { width, height: 400, x: 0, y: 0 } } });

beforeEach(() => {
  mockPods.mockReset();
  mockOpenPod.mockReset();
});

describe('ProfilePodsPanel', () => {
  it('shows a skeleton while the first page loads', () => {
    answer({ isLoading: true });
    renderWithProviders(<ProfilePodsPanel userId="u1" kind="hosted" requestFromHost="Asha" />);
    expect(screen.getByTestId('profile-pods-hosted-loading')).toBeOnTheScreen();
    expect(screen.queryByTestId('request-event-card')).toBeNull();
  });

  it('shows the failure instead of the pods', () => {
    answer({ error: new Error('down') });
    renderWithProviders(<ProfilePodsPanel userId="u1" kind="hosted" requestFromHost="Asha" />);
    expect(screen.getByTestId('profile-pods-hosted-error')).toBeOnTheScreen();
    expect(screen.queryByTestId('request-event-card')).toBeNull();
  });

  it('says a member has joined nothing, without offering a request', () => {
    answer();
    renderWithProviders(<ProfilePodsPanel userId="u1" kind="joined" requestFromHost="Asha" />);
    expect(screen.getByTestId('profile-pods-joined-empty')).toBeOnTheScreen();
    expect(screen.queryByTestId('request-event-card')).toBeNull();
  });

  it("offers someone else's host with no pods a request, addressed to that host", () => {
    answer();
    renderWithProviders(<ProfilePodsPanel userId="u1" kind="hosted" requestFromHost="Asha" />);
    expect(screen.getByTestId('profile-pods-hosted-empty')).toHaveTextContent(
      'No pods hosted yet.',
    );
    expect(screen.getByTestId('request-event-card')).toHaveTextContent('HOST:u1:Asha');
  });

  it('never offers a request on the owner’s own hosted tab', () => {
    answer();
    renderWithProviders(<ProfilePodsPanel userId="u1" kind="hosted" />);
    expect(screen.getByTestId('profile-pods-hosted-empty')).toBeOnTheScreen();
    expect(screen.queryByTestId('request-event-card')).toBeNull();
  });

  it('offers it under the pods when every hosted pod is over', () => {
    answer({ pods: [past] });
    renderWithProviders(<ProfilePodsPanel userId="u1" kind="hosted" requestFromHost="Asha" />);
    expect(screen.getByTestId('pod-card-p0')).toBeOnTheScreen();
    expect(screen.getByTestId('request-event-card')).toBeOnTheScreen();
  });

  it('does not offer it while a hosted pod is coming up, and opens a pod', () => {
    answer({ pods: [past, upcoming] });
    renderWithProviders(<ProfilePodsPanel userId="u1" kind="hosted" requestFromHost="Asha" />);
    expect(screen.queryByTestId('request-event-card')).toBeNull();
    fireEvent.press(screen.getByTestId('pod-card-p1'));
    expect(mockOpenPod).toHaveBeenCalledWith('club-1', 'POD-1', 'p1');
  });

  it("sizes the cards to the panel's own width once it is laid out", () => {
    answer({ pods: [upcoming] });
    renderWithProviders(<ProfilePodsPanel userId="u1" kind="joined" />);
    // Before the first layout the window answers (jest's 750 wide), capped at 520.
    expect(screen.getByTestId('pod-card-p1-width')).toHaveTextContent('520');

    // A 400-wide panel leaves 368 between its 16px side paddings.
    fireEvent(screen.getByTestId('profile-pods-joined'), 'layout', layout(400));
    expect(screen.getByTestId('pod-card-p1-width')).toHaveTextContent('368');

    // A wide panel is still capped.
    fireEvent(screen.getByTestId('profile-pods-joined'), 'layout', layout(900));
    expect(screen.getByTestId('pod-card-p1-width')).toHaveTextContent('520');
  });

  it('falls back to the window when the panel reports no room', () => {
    answer({ pods: [upcoming] });
    renderWithProviders(<ProfilePodsPanel userId="u1" kind="joined" />);
    fireEvent(screen.getByTestId('profile-pods-joined'), 'layout', layout(400));
    expect(screen.getByTestId('pod-card-p1-width')).toHaveTextContent('368');
    fireEvent(screen.getByTestId('profile-pods-joined'), 'layout', layout(20));
    expect(screen.getByTestId('pod-card-p1-width')).toHaveTextContent('520');
  });
});
