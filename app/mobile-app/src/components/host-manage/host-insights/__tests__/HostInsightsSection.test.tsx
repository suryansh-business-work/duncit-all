import { fireEvent, screen } from '@testing-library/react-native';

import { HostInsightsSection } from '@/components/host-manage/host-insights/HostInsightsSection';
import { useHostInsights } from '@/hooks/useHostInsights';
import { renderWithProviders } from '@/utils/test-utils';

// gifted-charts renders SVG — stub it so we exercise the wrapper mapping, not SVG.
jest.mock('react-native-gifted-charts', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    BarChart: () => <View testID="chart-bar" />,
    LineChart: () => <View testID="chart-line" />,
    PieChart: () => <View testID="chart-pie" />,
  };
});
jest.mock('@/hooks/useHostInsights', () => ({ useHostInsights: jest.fn() }));
const mockedInsights = useHostInsights as jest.Mock;

const monthsAgoIso = (m: number) => {
  const d = new Date();
  d.setDate(15);
  d.setMonth(d.getMonth() - m);
  return d.toISOString();
};

const withData = {
  totalPods: 5,
  hostEarning: 999.5,
  statusCounts: { upcoming: 1, ongoing: 1, completed: 2, cancelled: 1 },
  monthlyEarnings: [{ month: '2026-07', total: 400 }],
  isLoading: false,
};
const emptyData = {
  totalPods: 0,
  hostEarning: 0,
  statusCounts: { upcoming: 0, ongoing: 0, completed: 0, cancelled: 0 },
  monthlyEarnings: [],
  isLoading: false,
};
const pods = [
  { pod_date_time: monthsAgoIso(1), pod_attendees: [1, 2, 3], pod_hosts_id: [1] },
  { pod_date_time: monthsAgoIso(2), pod_attendees: [1, 2], pod_hosts_id: [1] },
];

beforeEach(() => jest.clearAllMocks());

describe('HostInsightsSection', () => {
  it('renders KPIs and every chart when there is data', () => {
    mockedInsights.mockReturnValue(withData);
    renderWithProviders(<HostInsightsSection pods={pods} currency="₹" />);
    expect(screen.getByText('Total Pods')).toBeOnTheScreen();
    expect(screen.getByText('₹999.50')).toBeOnTheScreen();
    expect(screen.getAllByTestId('chart-line').length).toBeGreaterThan(0);
    expect(screen.getByTestId('chart-bar')).toBeOnTheScreen();
    expect(screen.getByTestId('chart-pie')).toBeOnTheScreen();
  });

  it('shows the empty state when every chart is zero', () => {
    mockedInsights.mockReturnValue(emptyData);
    renderWithProviders(<HostInsightsSection pods={[]} currency="₹" />);
    expect(screen.getAllByText('No data available').length).toBeGreaterThanOrEqual(1);
  });

  it('filters the pods-by-month chart via the staged range sheet', () => {
    mockedInsights.mockReturnValue(withData);
    renderWithProviders(<HostInsightsSection pods={pods} currency="₹" />);
    expect(screen.getByText('Pods Hosted in Past 6 Months')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('insights-filter-open'));
    expect(screen.getByTestId('insights-filter-sheet')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('insights-range-PAST_3_MONTHS'));
    fireEvent.press(screen.getByTestId('insights-filter-reset'));
    fireEvent.press(screen.getByTestId('insights-range-ALL'));
    fireEvent.press(screen.getByTestId('insights-filter-apply'));
    expect(screen.getByText('All Hosted Pods')).toBeOnTheScreen();
  });

  it('closes the range sheet without applying', () => {
    mockedInsights.mockReturnValue(withData);
    renderWithProviders(<HostInsightsSection pods={pods} currency="₹" />);
    fireEvent.press(screen.getByTestId('insights-filter-open'));
    fireEvent.press(screen.getByTestId('insights-range-CURRENT_YEAR'));
    fireEvent.press(screen.getByTestId('insights-filter-close'));
    expect(screen.getByText('Pods Hosted in Past 6 Months')).toBeOnTheScreen();
  });
});
