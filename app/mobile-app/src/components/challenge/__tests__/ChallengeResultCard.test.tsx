import { fireEvent, screen } from '@testing-library/react-native';

import { ChallengeResultCard } from '@/components/challenge/ChallengeResultCard';
import type { PodChallengeView } from '@/hooks/usePodChallengeLive';
import { shareChallenge } from '@/utils/share';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;
  return { useTranslation: () => ({ t }) };
});
jest.mock('@/hooks/useDateFormat', () => ({
  useDateFormat: () => ({ formatDateTime: (value: string) => `on ${value}` }),
}));
jest.mock('@/utils/share', () => ({ shareChallenge: jest.fn().mockResolvedValue(undefined) }));

const standing = (id: string, name: string, rank: number, total: number) => ({
  competitor_id: id,
  name,
  rank,
  total,
});

const challengeOf = (result: Record<string, unknown> | null) =>
  ({ id: 'ch1', pod_id: 'pod1', name: 'Derby', result }) as unknown as PodChallengeView;

const resultOf = (patch: Record<string, unknown> = {}) => ({
  version: 1,
  published_at: '2026-10-26T12:00:00Z',
  winner_ids: ['c1'],
  standings: [
    standing('c1', 'Team Red', 1, 30),
    standing('c2', 'Team Blue', 2, 20),
    standing('c3', 'Team Green', 3, 10),
    standing('c4', 'Team Gold', 4, 5),
  ],
  ...patch,
});

describe('ChallengeResultCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('draws nothing until a result is published', () => {
    renderWithProviders(<ChallengeResultCard challenge={challengeOf(null)} />);
    expect(screen.queryByTestId('challenge-result-ch1')).toBeNull();
  });

  it('announces the winner, the podium and when it was published', () => {
    renderWithProviders(<ChallengeResultCard challenge={challengeOf(resultOf())} />);
    expect(screen.getByRole('heading', { name: 'Derby' })).toBeOnTheScreen();
    expect(screen.getByText('mweb.challenge.completed')).toBeOnTheScreen();
    expect(screen.getByText('mweb.challenge.winner|Team Red,30')).toBeOnTheScreen();
    expect(
      screen.getByText('mweb.challenge.placed|2,Team Blue · mweb.challenge.placed|3,Team Green'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('mweb.challenge.publishedOn|on 2026-10-26T12:00:00Z'),
    ).toBeOnTheScreen();
  });

  it('announces a tie with every winner', () => {
    renderWithProviders(
      <ChallengeResultCard
        challenge={challengeOf(
          resultOf({
            winner_ids: ['c1', 'c2'],
            standings: [standing('c1', 'Team Red', 1, 30), standing('c2', 'Team Blue', 1, 30)],
          }),
        )}
      />,
    );
    expect(screen.getByText('mweb.challenge.winnersTie|Team Red, Team Blue,30')).toBeOnTheScreen();
  });

  it('shows no podium line when nobody is placed second or third', () => {
    renderWithProviders(
      <ChallengeResultCard
        challenge={challengeOf(resultOf({ standings: [standing('c1', 'Team Red', 1, 30)] }))}
      />,
    );
    expect(screen.queryByText(/mweb.challenge.placed/)).toBeNull();
  });

  it('copes with a result that names no winner', () => {
    renderWithProviders(
      <ChallengeResultCard challenge={challengeOf(resultOf({ winner_ids: [], standings: [] }))} />,
    );
    expect(screen.getByText('mweb.challenge.winner|,')).toBeOnTheScreen();
  });

  it('marks a corrected result but not the first version', () => {
    const { unmount } = renderWithProviders(
      <ChallengeResultCard challenge={challengeOf(resultOf())} />,
    );
    expect(screen.queryByText(/mweb.challenge.corrected/)).toBeNull();
    unmount();
    renderWithProviders(<ChallengeResultCard challenge={challengeOf(resultOf({ version: 2 }))} />);
    expect(
      screen.getByText(
        'mweb.challenge.publishedOn|on 2026-10-26T12:00:00Z · mweb.challenge.corrected',
      ),
    ).toBeOnTheScreen();
  });

  it('shows the full leaderboard only when asked, and hides it again', () => {
    renderWithProviders(<ChallengeResultCard challenge={challengeOf(resultOf())} />);
    expect(screen.queryByText('mweb.challenge.standings')).toBeNull();
    expect(screen.getByText('mweb.challenge.showLeaderboard')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('challenge-result-toggle-ch1'));
    expect(screen.getByLabelText('mweb.challenge.standings')).toBeOnTheScreen();
    expect(screen.getByText('Team Gold')).toBeOnTheScreen();
    expect(screen.getByText('mweb.challenge.hideLeaderboard')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('challenge-result-toggle-ch1'));
    expect(screen.queryByLabelText('mweb.challenge.standings')).toBeNull();
  });

  it('offers a link to the arena only when it is given one', () => {
    const onView = jest.fn();
    const { unmount } = renderWithProviders(
      <ChallengeResultCard challenge={challengeOf(resultOf())} />,
    );
    expect(screen.queryByTestId('challenge-result-view-ch1')).toBeNull();
    unmount();
    renderWithProviders(
      <ChallengeResultCard challenge={challengeOf(resultOf())} onView={onView} />,
    );
    fireEvent.press(screen.getByTestId('challenge-result-view-ch1'));
    expect(onView).toHaveBeenCalledTimes(1);
  });

  it('shares the challenge', () => {
    renderWithProviders(<ChallengeResultCard challenge={challengeOf(resultOf())} />);
    fireEvent.press(screen.getByTestId('challenge-result-share-ch1'));
    expect(shareChallenge).toHaveBeenCalledWith('pod1', 'ch1', 'Derby');
  });
});
