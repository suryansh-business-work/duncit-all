import { fireEvent, screen } from '@testing-library/react-native';

import { LiveChallengeCard } from '@/components/challenge/LiveChallengeCard';
import { usePodChallengeLive } from '@/hooks/usePodChallengeLive';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;
  return { useTranslation: () => ({ t }) };
});
jest.mock('@/hooks/useDateFormat', () => ({
  useDateFormat: () => ({ formatDateTime: (value: string) => `at ${value}` }),
}));
jest.mock('@/hooks/usePodChallengeLive', () => ({ usePodChallengeLive: jest.fn() }));

const mockStandings = jest.fn();
jest.mock('@/components/challenge/ChallengeStandings', () => ({
  ChallengeStandings: (props: { limit?: number }) => {
    mockStandings(props);
    return null;
  },
}));
jest.mock('@/components/challenge/ChallengeClock', () => ({
  ChallengeClock: ({ receivedAt }: { receivedAt: number }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native');
    return <Text testID="clock">{`clock@${receivedAt}`}</Text>;
  },
}));
const mockResultProps = jest.fn();
jest.mock('@/components/challenge/ChallengeResultCard', () => ({
  ChallengeResultCard: (props: { onView?: () => void }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable } = require('react-native');
    mockResultProps(props);
    return <Pressable testID="result-card" onPress={props.onView} />;
  },
}));

const liveMock = jest.mocked(usePodChallengeLive);

const challengeOf = (patch: Record<string, unknown> = {}) => ({
  id: 'ch1',
  pod_id: 'pod1',
  name: 'Derby',
  status: 'LIVE',
  updated_at: '2026-10-26T10:00:00Z',
  tools: [],
  standings: [],
  result: null,
  ...patch,
});

const answer = (challenge: unknown) =>
  liveMock.mockReturnValue({ challenge, receivedAt: 777 } as unknown as ReturnType<
    typeof usePodChallengeLive
  >);

beforeEach(() => jest.clearAllMocks());

describe('LiveChallengeCard', () => {
  it('draws nothing until the challenge arrives', () => {
    answer(null);
    renderWithProviders(<LiveChallengeCard challengeId="ch1" onOpen={jest.fn()} />);
    expect(screen.queryByTestId('live-challenge-ch1')).toBeNull();
    expect(liveMock).toHaveBeenCalledWith('ch1');
  });

  it('shows a live preview with the status, name, top three and last update', () => {
    answer(challengeOf());
    renderWithProviders(<LiveChallengeCard challengeId="ch1" onOpen={jest.fn()} />);
    expect(screen.getByText('mweb.challenge.liveChallenge')).toBeOnTheScreen();
    expect(screen.getByText('mweb.challenge.status.LIVE')).toBeOnTheScreen();
    expect(screen.getByRole('heading', { name: 'Derby' })).toBeOnTheScreen();
    expect(
      screen.getByText('mweb.challenge.lastUpdated|at 2026-10-26T10:00:00Z'),
    ).toBeOnTheScreen();
    expect(mockStandings).toHaveBeenCalledWith(expect.objectContaining({ limit: 3 }));
    expect(screen.queryByTestId('clock')).toBeNull();
  });

  it('shows the challenge clock, fed the time the answer arrived, when it has one', () => {
    answer(
      challengeOf({ tools: [{ input_kind: 'POLL' }, { input_kind: 'CLOCK', instance_id: 'k1' }] }),
    );
    renderWithProviders(<LiveChallengeCard challengeId="ch1" onOpen={jest.fn()} />);
    expect(screen.getByTestId('clock')).toHaveTextContent('clock@777');
  });

  it('shows a paused challenge with its own status', () => {
    answer(challengeOf({ status: 'PAUSED' }));
    renderWithProviders(<LiveChallengeCard challengeId="ch1" onOpen={jest.fn()} />);
    expect(screen.getByText('mweb.challenge.status.PAUSED')).toBeOnTheScreen();
  });

  it('shows an unknown status as it is', () => {
    answer(challengeOf({ status: 'WEIRD' }));
    renderWithProviders(<LiveChallengeCard challengeId="ch1" onOpen={jest.fn()} />);
    expect(screen.getByText('WEIRD')).toBeOnTheScreen();
  });

  it('opens the arena for this challenge', () => {
    answer(challengeOf());
    const onOpen = jest.fn();
    renderWithProviders(<LiveChallengeCard challengeId="ch1" onOpen={onOpen} />);
    fireEvent.press(screen.getByTestId('live-challenge-open-ch1'));
    expect(onOpen).toHaveBeenCalledWith('pod1', 'ch1');
  });

  it('replaces the preview with the final result once it is published', () => {
    answer(challengeOf({ status: 'COMPLETED', result: { version: 1 } }));
    const onOpen = jest.fn();
    renderWithProviders(<LiveChallengeCard challengeId="ch1" onOpen={onOpen} />);
    expect(screen.queryByTestId('live-challenge-ch1')).toBeNull();
    fireEvent.press(screen.getByTestId('result-card'));
    expect(onOpen).toHaveBeenCalledWith('pod1', 'ch1');
  });

  it('shows nothing for a finished challenge whose result is not published yet', () => {
    answer(challengeOf({ status: 'ARCHIVED', result: null }));
    renderWithProviders(<LiveChallengeCard challengeId="ch1" onOpen={jest.fn()} />);
    expect(screen.queryByTestId('live-challenge-ch1')).toBeNull();
    expect(screen.queryByTestId('result-card')).toBeNull();
  });
});
