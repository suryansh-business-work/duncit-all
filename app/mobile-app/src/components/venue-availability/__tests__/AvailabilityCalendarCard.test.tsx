import { screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/utils/test-utils';
import { AvailabilityCalendarCard } from '../AvailabilityCalendarCard';

const stub = (name: string) =>
  function Stub(props: Record<string, unknown>) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native');
    mockSeen[name] = props;
    return <Text testID={`stub-${name}`}>{name}</Text>;
  };
const mockSeen: Record<string, Record<string, unknown>> = {};
jest.mock('../AvailabilityToolbar', () => ({
  AvailabilityToolbar: (p: Record<string, unknown>) => stub('toolbar')(p),
}));
jest.mock('../AvailabilityGrid', () => ({
  AvailabilityGrid: (p: Record<string, unknown>) => stub('grid')(p),
}));
jest.mock('../AvailabilityLegend', () => ({
  AvailabilityLegend: (p: Record<string, unknown>) => stub('legend')(p),
}));

const ANCHOR = new Date(2030, 0, 9);
const COUNTS = new Map();
const HOLIDAYS = new Set<string>();

const mount = ({ isLoading = false, error = null as string | null } = {}) => {
  const handlers = {
    onView: jest.fn(),
    onShift: jest.fn(),
    onToday: jest.fn(),
    onPickDay: jest.fn(),
    onRecurring: jest.fn(),
  };
  renderWithProviders(
    <AvailabilityCalendarCard
      view="week"
      anchor={ANCHOR}
      periodLabel="07 Jan – 13 Jan"
      canGoNext
      counts={COUNTS}
      holidays={HOLIDAYS}
      todayKey="2030-01-09"
      lastKey="2030-02-15"
      selectedDay="2030-01-10"
      isLoading={isLoading}
      error={error}
      {...handlers}
    />,
  );
  return handlers;
};

describe('AvailabilityCalendarCard', () => {
  it('stacks the toolbar, the grid and the legend', () => {
    mount();
    expect(screen.getByTestId('availability-calendar')).toBeOnTheScreen();
    expect(screen.getByTestId('stub-toolbar')).toBeOnTheScreen();
    expect(screen.getByTestId('stub-grid')).toBeOnTheScreen();
    expect(screen.getByTestId('stub-legend')).toBeOnTheScreen();
  });

  it('hands the toolbar its period and controls', () => {
    const handlers = mount();
    expect(mockSeen.toolbar).toMatchObject({
      view: 'week',
      periodLabel: '07 Jan – 13 Jan',
      canGoNext: true,
      onView: handlers.onView,
      onShift: handlers.onShift,
      onToday: handlers.onToday,
      onRecurring: handlers.onRecurring,
    });
  });

  it('hands the grid the period, the counts, the window and the picked day', () => {
    const handlers = mount();
    expect(mockSeen.grid).toMatchObject({
      view: 'week',
      anchor: ANCHOR,
      counts: COUNTS,
      holidays: HOLIDAYS,
      todayKey: '2030-01-09',
      lastKey: '2030-02-15',
      selectedDay: '2030-01-10',
      onPickDay: handlers.onPickDay,
    });
  });

  it('shows an alert line when the slots could not be read', () => {
    mount({ error: 'Network down' });
    expect(screen.getByTestId('availability-error')).toHaveTextContent('Network down');
  });

  it('shows no alert line without an error', () => {
    mount();
    expect(screen.queryByTestId('availability-error')).toBeNull();
  });

  it('shows a spinner while loading, and not otherwise', () => {
    mount({ isLoading: true });
    expect(screen.getByTestId('availability-loading')).toBeOnTheScreen();
  });

  it('shows no spinner once loaded', () => {
    mount();
    expect(screen.queryByTestId('availability-loading')).toBeNull();
  });
});
