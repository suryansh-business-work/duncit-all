import { screen } from '@testing-library/react-native';

import { SimpleBarChart, buildMonthlyCounts } from '@/components/SimpleBarChart';
import { renderWithProviders } from '@/utils/test-utils';

describe('buildMonthlyCounts', () => {
  it('buckets dates into the rolling month window and ignores junk', () => {
    const now = new Date();
    const thisMonth = now.toISOString();
    const data = buildMonthlyCounts([
      thisMonth,
      thisMonth,
      null,
      'bad-date',
      '1990-01-01T00:00:00Z',
    ]);
    expect(data).toHaveLength(6);
    const label = now.toLocaleString('en', { month: 'short' });
    expect(data.find((d) => d.label === label)?.value).toBe(2);
    expect(data.reduce((sum, d) => sum + d.value, 0)).toBe(2);
  });
});

describe('SimpleBarChart', () => {
  it('renders one bar per datum with values and labels', () => {
    renderWithProviders(
      <SimpleBarChart
        data={[
          { label: 'Jun', value: 3 },
          { label: 'Jul', value: 0 },
        ]}
      />,
    );
    expect(screen.getByTestId('bar-chart')).toBeOnTheScreen();
    expect(screen.getByText('Jun')).toBeOnTheScreen();
    expect(screen.getByText('3')).toBeOnTheScreen();
    expect(screen.getByText('Jul')).toBeOnTheScreen();
  });
});
