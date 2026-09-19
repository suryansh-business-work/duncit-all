import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import DashboardPage from '../../src/pages/DashboardPage';
import { CHALLENGE_STATS } from '../../src/graphql/challenges';
import { renderWithProviders } from '../testkit';
import { makeChallengeStats } from '../mocks';

const useQueryMock = vi.hoisted(() => vi.fn());
const navigateSpy = vi.hoisted(() => vi.fn());

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  useQuery: useQueryMock,
}));
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigateSpy,
}));
vi.mock('@duncit/ui', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
  StatCard: ({
    label,
    value,
    loading,
    onClick,
  }: {
    label: string;
    value: number;
    loading: boolean;
    onClick: () => void;
  }) => (
    <button type="button" data-testid={`stat-${label}`} data-loading={String(loading)} onClick={onClick}>
      {label}:{String(value)}
    </button>
  ),
}));

/** The dashboard's own layout query answers "never customised", so the grid
 * paints its default slots; only the stats query is what each test varies. */
const NO_SAVED_LAYOUT = { data: { myDashboardLayout: null }, error: undefined, refetch: vi.fn() };

const answerStats = (stats: { data?: unknown; loading: boolean }) => {
  useQueryMock.mockImplementation((query: unknown) =>
    query === CHALLENGE_STATS ? stats : NO_SAVED_LAYOUT,
  );
};

describe('DashboardPage', () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    navigateSpy.mockReset();
  });

  it('shows the cards loading while there are no cached stats', () => {
    answerStats({ data: undefined, loading: true });
    renderWithProviders(<DashboardPage />);
    expect(screen.getByTestId('stat-Total challenges')).toHaveAttribute('data-loading', 'true');
    expect(screen.getByTestId('stat-Active challenges')).toHaveAttribute('data-loading', 'true');
  });

  it('renders stat cards and navigates to /challenges on click', () => {
    answerStats({
      data: { challengeStats: makeChallengeStats({ total: 5, active: 2 }) },
      loading: false,
    });
    renderWithProviders(<DashboardPage />);

    expect(screen.getByTestId('stat-Total challenges')).toHaveTextContent('Total challenges:5');
    expect(screen.getByTestId('stat-Active challenges')).toHaveTextContent('Active challenges:2');

    fireEvent.click(screen.getByTestId('stat-Total challenges'));
    expect(navigateSpy).toHaveBeenCalledWith('/challenges');
  });

  it('falls back to 0 when the query resolves with no stats', () => {
    // loading=false + no data → cards render with the `stats?.[key] ?? 0` guard.
    answerStats({ data: undefined, loading: false });
    renderWithProviders(<DashboardPage />);
    expect(screen.getByTestId('stat-Total challenges')).toHaveTextContent('Total challenges:0');
    expect(screen.getByTestId('stat-Active challenges')).toHaveTextContent('Active challenges:0');
    expect(screen.getByTestId('stat-Total challenges')).toHaveAttribute('data-loading', 'false');
  });

  it('keeps the cards showing numbers when refetching with cached stats present', () => {
    answerStats({
      data: { challengeStats: makeChallengeStats({ total: 8, active: 3 }) },
      loading: true,
    });
    renderWithProviders(<DashboardPage />);
    expect(screen.getByTestId('stat-Active challenges')).toHaveAttribute('data-loading', 'false');
    expect(screen.getByTestId('stat-Active challenges')).toHaveTextContent('Active challenges:3');
  });
});
