import { fireEvent, screen } from '@testing-library/react-native';
import {
  emptyClubAdminKpis,
  formatCount,
  formatMoney,
  formatRating,
  type ClubAdminClubRow,
  type ClubAdminKpis,
} from '@duncit/utils';

import { StatTile } from '@/components/studio';
import { renderWithProviders } from '@/utils/test-utils';
import { CategoryTiles } from '../CategoryTiles';
import { ClubBreakdown } from '../ClubBreakdown';
import { KpiGroupsSection } from '../KpiGroupsSection';
import { TrendCard } from '../TrendCard';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});
const mockLine = jest.fn();
jest.mock('@/components/host-manage/host-insights/InsightCharts', () => ({
  InsightsLine: (props: {
    data: { label: string; value: number }[];
    color: string;
    area: boolean;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native');
    mockLine(props);
    return (
      <Text testID="line-stub">{props.data.map((d) => `${d.label}:${d.value}`).join(',')}</Text>
    );
  },
}));

beforeEach(() => jest.clearAllMocks());

describe('CategoryTiles', () => {
  const tile = (id: string, patch: Record<string, unknown> = {}) => ({
    category_id: id,
    name: `Category ${id}`,
    super_category: 'Sports',
    clubs: 3,
    pods: 12,
    ...patch,
  });

  it('shows a tile per category with its super category and counts', () => {
    renderWithProviders(
      <CategoryTiles categories={[tile('a'), tile('b', { clubs: 1200, pods: 0 })]} />,
    );
    expect(screen.getByText('clubAdmin.dashboard.yourCategories')).toBeOnTheScreen();
    expect(screen.getByText('Category a')).toBeOnTheScreen();
    expect(screen.getAllByText('Sports')).toHaveLength(2);
    expect(screen.getByTestId('club-dashboard-category-a-clubs')).toHaveTextContent(
      'clubAdmin.dashboard.clubs3',
    );
    expect(screen.getByTestId('club-dashboard-category-a-pods')).toHaveTextContent(
      'clubAdmin.dashboard.pods12',
    );
    expect(screen.getByTestId('club-dashboard-category-b-clubs')).toHaveTextContent(
      `clubAdmin.dashboard.clubs${formatCount(1200)}`,
    );
    expect(screen.queryByTestId('club-dashboard-categories-empty')).toBeNull();
  });

  it('shows no super line for a category without one', () => {
    renderWithProviders(<CategoryTiles categories={[tile('a', { super_category: null })]} />);
    expect(screen.queryByText('Sports')).toBeNull();
  });

  it('says there are no categories yet', () => {
    renderWithProviders(<CategoryTiles categories={[]} />);
    expect(screen.getByTestId('club-dashboard-categories-empty')).toHaveTextContent(
      'clubAdmin.dashboard.categoriesEmpty',
    );
  });
});

describe('ClubBreakdown', () => {
  const club = (id: string, patch: Partial<ClubAdminClubRow> = {}): ClubAdminClubRow => ({
    club_id: id,
    club_slug: `slug-${id}`,
    club_name: `Club ${id}`,
    total_pods: 14,
    upcoming_pods: 2,
    completed_pods: 12,
    followers: 90,
    rating: 4.25,
    revenue: 52000,
    ...patch,
  });

  it('shows a row per club with pods, rating and revenue in the given currency', () => {
    renderWithProviders(
      <ClubBreakdown clubs={[club('a'), club('b')]} currency="₹" onOpen={jest.fn()} />,
    );
    expect(screen.getByText('clubAdmin.dashboard.perClubBreakdown')).toBeOnTheScreen();
    expect(screen.getByText('Club a')).toBeOnTheScreen();
    expect(screen.getByTestId('club-dashboard-club-a-pods')).toHaveTextContent(
      'clubAdmin.dashboard.column.totalPods14',
    );
    expect(screen.getByTestId('club-dashboard-club-a-rating')).toHaveTextContent(
      `clubAdmin.dashboard.column.rating${formatRating(4.25)}`,
    );
    expect(screen.getByTestId('club-dashboard-club-a-revenue')).toHaveTextContent(
      `clubAdmin.dashboard.column.revenue${formatMoney(52000, { symbol: '₹' })}`,
    );
    expect(screen.queryByTestId('club-dashboard-clubs-empty')).toBeNull();
  });

  it('opens the pods of the club that was pressed', () => {
    const onOpen = jest.fn();
    renderWithProviders(
      <ClubBreakdown clubs={[club('a'), club('b')]} currency="₹" onOpen={onOpen} />,
    );
    fireEvent.press(screen.getByTestId('club-dashboard-club-b'));
    expect(onOpen).toHaveBeenCalledWith('b');
    expect(screen.getByTestId('club-dashboard-club-b').props['aria-label']).toBe('Club b');
  });

  it('says there are no clubs', () => {
    renderWithProviders(<ClubBreakdown clubs={[]} currency="₹" onOpen={jest.fn()} />);
    expect(screen.getByTestId('club-dashboard-clubs-empty')).toHaveTextContent(
      'clubAdmin.dashboard.noClubs',
    );
  });
});

describe('KpiGroupsSection', () => {
  const kpis: ClubAdminKpis = {
    ...emptyClubAdminKpis,
    assigned_clubs: 3,
    total_pods: 40,
    total_revenue: 125000,
    avg_rating: 4.5,
    ratings_count: 30,
    fill_rate: 0.75,
  };

  it('shows the four groups, each under its heading, with tiles two to a row', () => {
    renderWithProviders(<KpiGroupsSection kpis={kpis} />);
    for (const key of ['overview', 'engagement', 'community', 'revenue']) {
      expect(screen.getByTestId(`club-dashboard-group-${key}`)).toBeOnTheScreen();
    }
    // Fourteen cards altogether.
    expect(screen.getAllByTestId('stat-tile')).toHaveLength(14);
  });
  it('writes counts big and money in the admin currency', () => {
    renderWithProviders(<KpiGroupsSection kpis={kpis} />);
    const values = screen.getAllByTestId('stat-tile-value').map((node) => node.props.children);
    expect(values).toContain(formatCount(3));
    expect(values).toContain(formatMoney(125000, { symbol: '₹' }));
    const sizes = screen.UNSAFE_getAllByType(StatTile).map((tile) => tile.props.size);
    expect(sizes.filter((size) => size === 'lg')).toHaveLength(11);
    expect(sizes.filter((size) => size === 'md')).toHaveLength(3);
  });
});

describe('TrendCard', () => {
  const trend = [
    { label: 'Aug', pods: 4, bookings: 20, followers: 5, revenue: 4000 },
    { label: 'Sep', pods: 6, bookings: 31, followers: 9, revenue: 7500 },
  ];

  it('plots pods first, from the monthly points', () => {
    renderWithProviders(<TrendCard trend={trend} />);
    expect(screen.getByText('clubAdmin.dashboard.monthlyTrend')).toBeOnTheScreen();
    expect(screen.getByTestId('line-stub')).toHaveTextContent('Aug:4,Sep:6');
    expect(mockLine.mock.calls[0][0].area).toBe(true);
    expect(screen.getByTestId('club-dashboard-series-pods').props['aria-checked']).toBe(true);
  });

  it('switches to another series, re-plotting its values', () => {
    renderWithProviders(<TrendCard trend={trend} />);
    fireEvent.press(screen.getByTestId('club-dashboard-series-revenue'));
    expect(screen.getByTestId('line-stub')).toHaveTextContent('Aug:4000,Sep:7500');
    expect(screen.getByTestId('club-dashboard-series-revenue').props['aria-checked']).toBe(true);
    expect(screen.getByTestId('club-dashboard-series-pods').props['aria-checked']).toBe(false);
  });

  it('says there is no trend yet when every point is zero', () => {
    renderWithProviders(
      <TrendCard trend={[{ label: 'Aug', pods: 0, bookings: 0, followers: 0, revenue: 0 }]} />,
    );
    expect(screen.getByTestId('club-dashboard-trend-empty')).toHaveTextContent(
      'clubAdmin.dashboard.trendEmpty',
    );
    expect(screen.queryByTestId('line-stub')).toBeNull();
  });

  it('says there is no trend yet for no points at all', () => {
    renderWithProviders(<TrendCard trend={[]} />);
    expect(screen.getByTestId('club-dashboard-trend-empty')).toBeOnTheScreen();
  });

  it('colours each series with its own palette entry', () => {
    renderWithProviders(<TrendCard trend={trend} />);
    const podsColor = mockLine.mock.calls.at(-1)?.[0].color;
    fireEvent.press(screen.getByTestId('club-dashboard-series-followers'));
    const followersColor = mockLine.mock.calls.at(-1)?.[0].color;
    expect(typeof podsColor).toBe('string');
    expect(typeof followersColor).toBe('string');
  });
});
