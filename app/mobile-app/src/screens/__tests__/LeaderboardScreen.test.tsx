import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { MobileLeaderboardBoardDocument } from '@/graphql/leaderboard';
import { LeaderboardScreen } from '@/screens/LeaderboardScreen';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: jest.fn(), navigate: jest.fn() }),
}));

const mockRequest = graphqlRequest as jest.Mock;

const entry = (rank: number, name: string, over: Record<string, unknown> = {}) => ({
  rank,
  user_id: `u${rank}`,
  name,
  avatar_url: null,
  points: 100 - rank,
  is_me: false,
  ...over,
});

const board = (over: Record<string, unknown> = {}) => ({
  leaderboard: {
    category: 'USER',
    period: 'MONTH',
    my_points: 42,
    my_rank: 5,
    participants: 12,
    rows: [entry(1, 'Asha'), entry(2, 'Ravi'), entry(3, 'Meera'), entry(4, 'Dev', { is_me: true })],
    ...over,
  },
});

const config = {
  leaderboardConfig: {
    points_per_join: 5,
    points_per_host: 0,
    points_per_club_pod: 0,
    points_per_venue_pod: 0,
    points_per_product_sale: 0,
    rewards: [
      {
        category: 'USER',
        period: 'MONTHLY',
        rank_from: 1,
        rank_to: 1,
        title: 'Free pod pass',
        description: 'For the top spot',
      },
      {
        category: 'HOST',
        period: 'YEARLY',
        rank_from: 1,
        rank_to: 3,
        title: 'Host trophy',
        description: '',
      },
    ],
  },
};

type Handler = () => unknown;
function route(handlers: { board?: Handler; config?: Handler }) {
  mockRequest.mockImplementation(async (doc: unknown) => {
    const run = doc === MobileLeaderboardBoardDocument ? handlers.board : handlers.config;
    return run?.();
  });
}

const boardCalls = () =>
  mockRequest.mock.calls.filter((c) => c[0] === MobileLeaderboardBoardDocument);

beforeEach(() => mockRequest.mockReset());

describe('LeaderboardScreen', () => {
  it('shows the caller standing, the ranked rows and the earn and reward cards', async () => {
    route({ board: () => board(), config: () => config });
    renderWithProviders(<LeaderboardScreen />);
    await waitFor(() => expect(screen.getByTestId('leaderboard-row-4')).toBeOnTheScreen());
    expect(screen.getByTestId('leaderboard-your-points')).toHaveTextContent(/42.*Rank #5/);
    await waitFor(() => expect(screen.getByTestId('leaderboard-how-to-earn')).toBeOnTheScreen());
    expect(screen.getByText('Free pod pass')).toBeOnTheScreen();
    // The host trophy belongs to another board.
    expect(screen.queryByText('Host trophy')).toBeNull();
    expect(boardCalls()[0][1]).toEqual({ category: 'USER', period: 'MONTH' });
    expect(boardCalls()[0][2]).toEqual({ auth: true });
  });

  it('re-reads the board for the chosen tab and period', async () => {
    route({ board: () => board(), config: () => config });
    renderWithProviders(<LeaderboardScreen />);
    await waitFor(() => expect(boardCalls()).toHaveLength(1));

    await act(async () => {
      fireEvent.press(screen.getByTestId('leaderboard-tab-HOST'));
    });
    await waitFor(() => expect(boardCalls()).toHaveLength(2));
    expect(boardCalls()[1][1]).toEqual({ category: 'HOST', period: 'MONTH' });
    // Rewards now follow the HOST board.
    await waitFor(() => expect(screen.getByText('Host trophy')).toBeOnTheScreen());

    await act(async () => {
      fireEvent.press(screen.getByTestId('leaderboard-period-YEAR'));
    });
    await waitFor(() => expect(boardCalls()).toHaveLength(3));
    expect(boardCalls()[2][1]).toEqual({ category: 'HOST', period: 'YEAR' });
  });

  it('shows a spinner for each section while loading', async () => {
    mockRequest.mockImplementation(() => new Promise(() => undefined));
    renderWithProviders(<LeaderboardScreen />);
    expect(screen.getByTestId('leaderboard-loading')).toBeOnTheScreen();
    expect(screen.getByTestId('leaderboard-config-loading')).toBeOnTheScreen();
  });

  it('says so when the board cannot be read', async () => {
    route({
      board: () => {
        throw new Error('down');
      },
      config: () => config,
    });
    renderWithProviders(<LeaderboardScreen />);
    await waitFor(() => expect(screen.getByTestId('leaderboard-error')).toBeOnTheScreen());
    expect(screen.queryByTestId('leaderboard-row-1')).toBeNull();
  });

  it('shows an empty board and no earn or reward cards when the config fails', async () => {
    route({
      board: () => board({ rows: [], my_rank: null, my_points: 0, participants: 0 }),
      config: () => {
        throw new Error('config down');
      },
    });
    renderWithProviders(<LeaderboardScreen />);
    await waitFor(() => expect(screen.getByTestId('leaderboard-empty')).toBeOnTheScreen());
    await waitFor(() => expect(screen.queryByTestId('leaderboard-config-loading')).toBeNull());
    expect(screen.queryByTestId('leaderboard-rewards')).toBeNull();
    expect(screen.queryByTestId('leaderboard-how-to-earn')).toBeNull();
  });
});
