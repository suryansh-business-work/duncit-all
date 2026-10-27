import { fireEvent, screen } from '@testing-library/react-native';
import { DEFAULT_CLUB_ADMIN_RANGE, emptyClubAdminDashboard } from '@duncit/utils';

import { useClubAdminDashboard } from '@/hooks/useClubAdminDashboard';
import { ClubAdminDashboardScreen } from '@/screens/ClubAdminDashboardScreen/ClubAdminDashboardScreen';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('@/hooks/useClubAdminDashboard', () => ({ useClubAdminDashboard: jest.fn() }));
jest.mock('@/components/StackScreen', () => ({
  StackScreen: ({
    title,
    testID,
    children,
  }: {
    title: string;
    testID: string;
    children: unknown;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text, View } = require('react-native');
    return (
      <View testID={testID}>
        <Text testID="screen-title">{title}</Text>
        {children}
      </View>
    );
  },
}));
jest.mock('@/components/PullToRefresh', () => ({
  RefreshScrollView: ({ children }: { children: unknown }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));
const mockSeen: Record<string, Record<string, unknown>> = {};
const mockStub = (name: string, press?: (props: Record<string, unknown>) => void) =>
  function Stub(props: Record<string, unknown>) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable, Text } = require('react-native');
    mockSeen[name] = props;
    return (
      <Pressable testID={`stub-${name}`} onPress={() => press?.(props)}>
        <Text>{name}</Text>
      </Pressable>
    );
  };
jest.mock('@/components/club-admin/dashboard/KpiGroupsSection', () => ({
  KpiGroupsSection: (p: Record<string, unknown>) => mockStub('kpis')(p),
}));
jest.mock('@/components/club-admin/dashboard/TrendCard', () => ({
  TrendCard: (p: Record<string, unknown>) => mockStub('trend')(p),
}));
jest.mock('@/components/club-admin/dashboard/CategoryTiles', () => ({
  CategoryTiles: (p: Record<string, unknown>) => mockStub('categories')(p),
}));
jest.mock('@/components/club-admin/dashboard/ClubBreakdown', () => ({
  ClubBreakdown: (p: Record<string, unknown>) =>
    mockStub('clubs', (props) => {
      const open: unknown = props.onOpen;
      if (typeof open === 'function') open('c7');
    })(p),
}));

const dashboardMock = jest.mocked(useClubAdminDashboard);

const mount = (patch: Record<string, unknown> = {}) => {
  const state = {
    data: {
      ...emptyClubAdminDashboard,
      kpis: { ...emptyClubAdminDashboard.kpis, currency_symbol: '$' },
      trend: [{ label: 'Oct' }],
      clubs: [{ club_id: 'c1' }],
      categories: [{ category_id: 'k1' }],
    },
    isLoading: false,
    hasError: false,
    refetch: jest.fn(),
    ...patch,
  };
  dashboardMock.mockReturnValue(state as unknown as ReturnType<typeof useClubAdminDashboard>);
  renderWithProviders(<ClubAdminDashboardScreen />);
  return state;
};

beforeEach(() => jest.clearAllMocks());

describe('ClubAdminDashboardScreen', () => {
  it('titles the screen and reads the default range', () => {
    mount();
    expect(screen.getByTestId('screen-title')).toHaveTextContent('mweb.meta.clubDashboard.title');
    expect(dashboardMock).toHaveBeenCalledWith(DEFAULT_CLUB_ADMIN_RANGE);
  });

  it('hands each section its part of the dashboard', () => {
    const state = mount();
    expect(mockSeen.kpis?.kpis).toBe(state.data.kpis);
    expect(mockSeen.trend?.trend).toBe(state.data.trend);
    expect(mockSeen.clubs).toMatchObject({ clubs: state.data.clubs, currency: '$' });
    expect(mockSeen.categories?.categories).toBe(state.data.categories);
  });

  it('offers every range, marking the default', () => {
    mount();
    expect(
      screen.getByTestId(`club-dashboard-range-${DEFAULT_CLUB_ADMIN_RANGE}`).props['aria-checked'],
    ).toBe(true);
    for (const range of ['30d', 'month', '12m', 'all']) {
      expect(screen.getByTestId(`club-dashboard-range-${range}`)).toBeOnTheScreen();
    }
  });

  it('reads the dashboard again for the range that was picked', () => {
    mount();
    fireEvent.press(screen.getByTestId('club-dashboard-range-30d'));
    expect(dashboardMock).toHaveBeenLastCalledWith('30d');
    expect(screen.getByTestId('club-dashboard-range-30d').props['aria-checked']).toBe(true);
  });

  it('opens the pods of the club picked in the breakdown', () => {
    mount();
    fireEvent.press(screen.getByTestId('stub-clubs'));
    expect(mockNavigate).toHaveBeenCalledWith('ClubPods', { clubId: 'c7' });
  });

  it('shows a spinner while loading', () => {
    mount({ isLoading: true });
    expect(screen.getByTestId('club-dashboard-loading')).toBeOnTheScreen();
  });

  it('shows no spinner and no error once loaded', () => {
    mount();
    expect(screen.queryByTestId('club-dashboard-loading')).toBeNull();
    expect(screen.queryByTestId('club-dashboard-error')).toBeNull();
  });

  it('says the load failed and retries', () => {
    const state = mount({ hasError: true });
    fireEvent.press(screen.getByTestId('club-dashboard-error-retry'));
    expect(state.refetch).toHaveBeenCalledTimes(1);
  });
});
