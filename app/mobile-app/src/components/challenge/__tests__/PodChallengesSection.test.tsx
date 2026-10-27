import { fireEvent, screen } from '@testing-library/react-native';

import { PodChallengesSection } from '@/components/challenge/PodChallengesSection';
import { usePodChallenges } from '@/hooks/usePodChallenges';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('@/hooks/usePodChallenges', () => ({ usePodChallenges: jest.fn() }));
jest.mock('@/components/challenge/LiveChallengeCard', () => ({
  LiveChallengeCard: ({
    challengeId,
    onOpen,
  }: {
    challengeId: string;
    onOpen: (pod: string, id: string) => void;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable } = require('react-native');
    return <Pressable testID={`live-${challengeId}`} onPress={() => onOpen('podX', challengeId)} />;
  },
}));
jest.mock('@/components/challenge/ChallengeResultCard', () => ({
  ChallengeResultCard: ({
    challenge,
    onView,
  }: {
    challenge: { id: string };
    onView: () => void;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable } = require('react-native');
    return <Pressable testID={`result-${challenge.id}`} onPress={onView} />;
  },
}));

const podChallengesMock = jest.mocked(usePodChallenges);
const challenge = (id: string, status: string, patch: Record<string, unknown> = {}) => ({
  id,
  pod_id: 'pod1',
  status,
  show_on_pod_details: true,
  result: null,
  ...patch,
});

const mount = (challenges: unknown[], finishedOnly?: boolean) => {
  podChallengesMock.mockReturnValue({ challenges } as unknown as ReturnType<
    typeof usePodChallenges
  >);
  renderWithProviders(<PodChallengesSection podId="pod1" finishedOnly={finishedOnly} />);
};

beforeEach(() => jest.clearAllMocks());

describe('PodChallengesSection', () => {
  it('reads the challenges of its pod', () => {
    mount([]);
    expect(podChallengesMock).toHaveBeenCalledWith('pod1');
  });

  it('draws nothing when there is nothing to show', () => {
    mount([]);
    expect(screen.queryByTestId('pod-challenges')).toBeNull();
  });

  it('draws nothing before play starts', () => {
    mount([challenge('c1', 'SCHEDULED'), challenge('c2', 'DRAFT')]);
    expect(screen.queryByTestId('pod-challenges')).toBeNull();
  });

  it('shows a live card for each challenge in play that the host shows on pod details', () => {
    mount([
      challenge('c1', 'LIVE'),
      challenge('c2', 'PAUSED'),
      challenge('c3', 'LIVE', { show_on_pod_details: false }),
    ]);
    expect(screen.getByTestId('live-c1')).toBeOnTheScreen();
    expect(screen.getByTestId('live-c2')).toBeOnTheScreen();
    expect(screen.queryByTestId('live-c3')).toBeNull();
  });

  it('shows the result card for a finished challenge that has a result, not for one without', () => {
    mount([
      challenge('c1', 'COMPLETED', { result: { version: 1 } }),
      challenge('c2', 'ARCHIVED', { result: { version: 1 } }),
      challenge('c3', 'COMPLETED'),
    ]);
    expect(screen.getByTestId('result-c1')).toBeOnTheScreen();
    expect(screen.getByTestId('result-c2')).toBeOnTheScreen();
    expect(screen.queryByTestId('result-c3')).toBeNull();
  });

  it('shows only finished challenges when asked (Pod History)', () => {
    mount(
      [challenge('c1', 'LIVE'), challenge('c2', 'COMPLETED', { result: { version: 1 } })],
      true,
    );
    expect(screen.queryByTestId('live-c1')).toBeNull();
    expect(screen.getByTestId('result-c2')).toBeOnTheScreen();
  });

  it('draws nothing in Pod History when nothing has finished', () => {
    mount([challenge('c1', 'LIVE')], true);
    expect(screen.queryByTestId('pod-challenges')).toBeNull();
  });

  it('opens the arena from a live card', () => {
    mount([challenge('c1', 'LIVE')]);
    fireEvent.press(screen.getByTestId('live-c1'));
    expect(mockNavigate).toHaveBeenCalledWith('ChallengeArena', {
      podId: 'podX',
      challengeId: 'c1',
    });
  });

  it('opens the arena from a result card with its own pod and id', () => {
    mount([challenge('c9', 'COMPLETED', { result: { version: 1 }, pod_id: 'pod9' })]);
    fireEvent.press(screen.getByTestId('result-c9'));
    expect(mockNavigate).toHaveBeenCalledWith('ChallengeArena', {
      podId: 'pod9',
      challengeId: 'c9',
    });
  });
});
