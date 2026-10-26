import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import HowToEarnCard from '../HowToEarnCard';
import YourPointsCard from '../YourPointsCard';
import LeaderboardPage from '../index';
import { fallbackT } from '../../../i18n/fallback';

const h = vi.hoisted(() => ({ useQuery: vi.fn() }));

vi.mock('@apollo/client/react', async (orig) => ({ ...(await orig<object>()), useQuery: h.useQuery }));
vi.mock('../LeaderboardList', () => ({ default: (p: { rows: unknown[] }) => <div data-testid="list" data-rows={p.rows.length} /> }));
vi.mock('../RewardsCard', () => ({ default: (p: { category: string }) => <div data-testid="rewards" data-category={p.category} /> }));

const config = (over: object = {}) => ({
  points_per_join: 10,
  points_per_host: 20,
  points_per_club_pod: 0,
  points_per_venue_pod: 5,
  points_per_product_sale: 0,
  rewards: [],
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe('HowToEarnCard', () => {
  it('lists only the boards whose action earns points, priced from the config', () => {
    render(<HowToEarnCard config={config() as never} />);
    expect(screen.getByTestId('leaderboard-how-to-earn-points-USER')).toHaveTextContent(fallbackT('mweb.leaderboard.earnPoints', { vars: { points: 10 } }));
    expect(screen.getByTestId('leaderboard-how-to-earn-points-HOST')).toHaveTextContent(fallbackT('mweb.leaderboard.earnPoints', { vars: { points: 20 } }));
    expect(screen.getByTestId('leaderboard-how-to-earn-points-VENUE')).toBeInTheDocument();
    expect(screen.queryByTestId('leaderboard-how-to-earn-row-CLUB_ADMIN')).not.toBeInTheDocument();
    expect(screen.queryByTestId('leaderboard-how-to-earn-row-BRAND')).not.toBeInTheDocument();
  });

  it('renders nothing when every action is switched off, or a points field is missing', () => {
    const { container, unmount } = render(
      <HowToEarnCard config={config({ points_per_join: 0, points_per_host: 0, points_per_venue_pod: 0 }) as never} />
    );
    expect(container).toBeEmptyDOMElement();
    unmount();
    const missing = render(<HowToEarnCard config={config({ points_per_join: undefined, points_per_host: undefined, points_per_venue_pod: undefined }) as never} />);
    expect(missing.container).toBeEmptyDOMElement();
  });

  it('shows every board when all of them earn', () => {
    render(<HowToEarnCard config={config({ points_per_club_pod: 3, points_per_product_sale: 4 }) as never} />);
    expect(screen.getAllByTestId(/leaderboard-how-to-earn-row-/)).toHaveLength(5);
  });
});

describe('YourPointsCard', () => {
  const board = (over: object = {}) => ({ my_points: 120, my_rank: 4, participants: 30, rows: [], category: 'USER', period: 'MONTH', ...over });

  it('shows the caller points, rank and the number of participants', () => {
    render(<YourPointsCard board={board() as never} loading={false} />);
    expect(screen.getByTestId('leaderboard-your-points-value')).toHaveTextContent('120');
    expect(screen.getByTestId('leaderboard-your-points-rank')).toHaveTextContent(fallbackT('mweb.leaderboard.yourRank', { vars: { rank: 4 } }));
    expect(screen.getByTestId('leaderboard-your-points')).toHaveTextContent(fallbackT('mweb.leaderboard.participantsMany', { count: 30 }));
    expect(screen.queryByText(fallbackT('mweb.leaderboard.notRankedHint'))).not.toBeInTheDocument();
  });

  it('uses the singular for one participant', () => {
    render(<YourPointsCard board={board({ participants: 1 }) as never} loading={false} />);
    expect(screen.getByTestId('leaderboard-your-points')).toHaveTextContent(fallbackT('mweb.leaderboard.participantsOne'));
  });

  it('says not ranked, with the hint, when the caller has no rank', () => {
    render(<YourPointsCard board={board({ my_rank: null, my_points: 0 }) as never} loading={false} />);
    expect(screen.getByTestId('leaderboard-your-points-rank')).toHaveTextContent(fallbackT('mweb.leaderboard.notRanked'));
    expect(screen.getByText(fallbackT('mweb.leaderboard.notRankedHint'))).toBeInTheDocument();
  });

  it('shows a loading placeholder instead of a zero while the first read is in flight', () => {
    render(<YourPointsCard board={null} loading />);
    expect(screen.getByTestId('leaderboard-your-points-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('leaderboard-your-points-value')).not.toBeInTheDocument();
  });

  it('shows zero with no board once loading is over', () => {
    render(<YourPointsCard board={null} loading={false} />);
    expect(screen.getByTestId('leaderboard-your-points-value')).toHaveTextContent('0');
  });

  it('keeps showing the board while a refresh is loading', () => {
    render(<YourPointsCard board={board() as never} loading />);
    expect(screen.getByTestId('leaderboard-your-points-value')).toHaveTextContent('120');
  });
});

describe('LeaderboardPage', () => {
  const queries = (state: { board?: object | null; loading?: boolean; error?: boolean; config?: object | null; configLoading?: boolean } = {}) =>
    h.useQuery.mockImplementation((doc: { loc?: { source: { body: string } } }, options: { variables?: object }) => {
      const body = doc.loc?.source.body ?? '';
      if (body.includes('leaderboardConfig')) return { data: state.config ? { leaderboardConfig: state.config } : undefined, loading: state.configLoading ?? false };
      void options;
      return { data: state.board ? { leaderboard: state.board } : undefined, loading: state.loading ?? false, error: state.error ? new Error('x') : undefined };
    });
  const page = (url = '/leaderboard') =>
    render(
      <MemoryRouter initialEntries={[url]}>
        <LeaderboardPage />
      </MemoryRouter>
    );
  const board = { my_points: 5, my_rank: 2, participants: 10, rows: [{ rank: 1 }, { rank: 2 }] };

  it('shows the user board for the month by default, with the list and the rewards for it', () => {
    queries({ board, config: config() });
    page();
    expect(screen.getByTestId('leaderboard-page-title')).toHaveTextContent(fallbackT('mweb.leaderboard.title'));
    expect(h.useQuery.mock.calls[0][1]).toMatchObject({ variables: { category: 'USER', period: 'MONTH' } });
    expect(screen.getByTestId('list')).toHaveAttribute('data-rows', '2');
    expect(screen.getByTestId('rewards')).toHaveAttribute('data-category', 'USER');
    expect(screen.getByTestId('leaderboard-how-to-earn')).toBeInTheDocument();
  });

  it('switches period, ignoring a deselect of the chosen one', () => {
    queries({ board, config: config() });
    page();
    fireEvent.click(screen.getByTestId('leaderboard-period-YEAR'));
    expect(h.useQuery.mock.calls.filter((call) => call[1]?.variables).at(-1)?.[1]).toMatchObject({ variables: { category: 'USER', period: 'YEAR' } });
    fireEvent.click(screen.getByTestId('leaderboard-period-YEAR'));
    expect(h.useQuery.mock.calls.filter((call) => call[1]?.variables).at(-1)?.[1]).toMatchObject({ variables: { category: 'USER', period: 'YEAR' } });
  });

  it('switches board from the category tabs, and starts on the one in the URL', () => {
    queries({ board, config: config() });
    page('/leaderboard?selectedtab=HOST');
    expect(h.useQuery.mock.calls[0][1]).toMatchObject({ variables: { category: 'HOST', period: 'MONTH' } });
    expect(screen.getByTestId('rewards')).toHaveAttribute('data-category', 'HOST');
    fireEvent.click(screen.getByTestId('leaderboard-tab-VENUE'));
    expect(h.useQuery.mock.calls.filter((call) => call[1]?.variables).at(-1)?.[1]).toMatchObject({ variables: { category: 'VENUE' } });
  });

  it('shows a spinner while the board loads, and one for the config', () => {
    queries({ loading: true, configLoading: true });
    page();
    expect(screen.getByTestId('leaderboard-loading')).toBeInTheDocument();
    expect(screen.getByTestId('leaderboard-config-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('list')).not.toBeInTheDocument();
  });

  it('shows the load error and an empty list when there is no board', () => {
    queries({ error: true, config: null });
    page();
    expect(screen.getByTestId('leaderboard-error')).toHaveTextContent(fallbackT('mweb.leaderboard.loadError'));
    expect(screen.getByTestId('list')).toHaveAttribute('data-rows', '0');
    expect(screen.queryByTestId('leaderboard-how-to-earn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rewards')).not.toBeInTheDocument();
  });

  it('keeps the list while a refresh runs over data already on screen', () => {
    queries({ board, loading: true, config: config(), configLoading: true });
    page();
    expect(screen.queryByTestId('leaderboard-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('leaderboard-config-loading')).not.toBeInTheDocument();
    expect(screen.getByTestId('list')).toHaveAttribute('data-rows', '2');
  });
});
