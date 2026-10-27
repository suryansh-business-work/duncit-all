import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/utils/test-utils';
import { AvailabilityGrid } from '../AvailabilityGrid';
import type { CalendarView, DayCounts } from '../availability-grid';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});
jest.mock('@/hooks/useDateFormat', () => ({
  useDateFormat: () => ({
    formatDay: (key: string) => `day:${key}`,
    formatPattern: (_date: Date, pattern: string) => `p:${pattern}`,
  }),
}));
jest.mock('@/components/slots/WeekdayHeader', () => ({
  WeekdayHeader: ({ initials }: { initials: unknown[] }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native');
    return <Text testID="weekday-header">{`weekdays:${initials.length}`}</Text>;
  },
}));
const mockCells = jest.fn();
jest.mock('@/components/venue-availability/AvailabilityDayCell', () => ({
  AvailabilityDayCell: (props: { dayKey: string; onPress: (key: string) => void }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable } = require('react-native');
    mockCells(props);
    return (
      <Pressable testID={`cell-${props.dayKey}`} onPress={() => props.onPress(props.dayKey)} />
    );
  },
}));

// 2030-01-09 is a Wednesday.
const ANCHOR = new Date(2030, 0, 9);
const COUNTS = new Map<string, DayCounts>([
  ['2030-01-10', { available: 2, pending: 0, booked: 1, blocked: 0 }],
]);

const mount = (
  view: CalendarView,
  extra: Partial<{
    selectedDay: string | null;
    holidays: Set<string>;
    onPickDay: (key: string) => void;
  }> = {},
) => {
  const onPickDay = extra.onPickDay ?? jest.fn();
  renderWithProviders(
    <AvailabilityGrid
      view={view}
      anchor={ANCHOR}
      counts={COUNTS}
      holidays={extra.holidays ?? new Set(['2030-01-12'])}
      todayKey="2030-01-09"
      lastKey="2030-02-15"
      selectedDay={extra.selectedDay ?? null}
      onPickDay={onPickDay}
    />,
  );
  return onPickDay;
};

const propsOf = (key: string) =>
  mockCells.mock.calls.map(([props]) => props).find((props) => props.dayKey === key);

beforeEach(() => jest.clearAllMocks());

describe('AvailabilityGrid', () => {
  it('draws the whole month under a weekday header, padding the first and last weeks', () => {
    mount('month');
    expect(screen.getByTestId('availability-grid')).toBeOnTheScreen();
    expect(screen.getByTestId('weekday-header')).toHaveTextContent('weekdays:7');
    expect(screen.getAllByTestId(/^cell-/)).toHaveLength(31);
    expect(propsOf('2030-01-01').label).toBe('1');
    expect(propsOf('2030-01-31').label).toBe('31');
  });

  it('draws the seven days of the anchor week, Monday first', () => {
    mount('week');
    const days = mockCells.mock.calls.map(([props]) => props.dayKey);
    expect(days).toEqual([
      '2030-01-07',
      '2030-01-08',
      '2030-01-09',
      '2030-01-10',
      '2030-01-11',
      '2030-01-12',
      '2030-01-13',
    ]);
    expect(screen.getByTestId('weekday-header')).toBeOnTheScreen();
  });

  it('draws one full-date cell and no weekday header for the day view', () => {
    mount('day');
    expect(screen.queryByTestId('weekday-header')).toBeNull();
    expect(screen.getAllByTestId(/^cell-/)).toHaveLength(1);
    expect(propsOf('2030-01-09').label).toBe('day:2030-01-09');
  });

  it('gives each cell its counts, state, today and selected flags', () => {
    mount('week', { selectedDay: '2030-01-11' });
    expect(propsOf('2030-01-10').counts).toEqual({
      available: 2,
      pending: 0,
      booked: 1,
      blocked: 0,
    });
    expect(propsOf('2030-01-08').counts).toBeUndefined();
    expect(propsOf('2030-01-08').state).toBe('disabled');
    expect(propsOf('2030-01-09')).toMatchObject({ isToday: true, selected: false, state: 'open' });
    expect(propsOf('2030-01-11')).toMatchObject({ isToday: false, selected: true });
    expect(propsOf('2030-01-12').state).toBe('holiday');
    expect(propsOf('2030-01-12').leaveTag).toBe('availability.leaveTag');
  });

  it('keeps days past the publishing window inert', () => {
    renderWithProviders(
      <AvailabilityGrid
        view="week"
        anchor={ANCHOR}
        counts={COUNTS}
        holidays={new Set()}
        todayKey="2030-01-09"
        lastKey="2030-01-10"
        selectedDay={null}
        onPickDay={jest.fn()}
      />,
    );
    expect(propsOf('2030-01-11').state).toBe('disabled');
    expect(propsOf('2030-01-10').state).toBe('open');
  });

  it('spells the leave note out in the day view only, on a holiday', () => {
    renderWithProviders(
      <AvailabilityGrid
        view="day"
        anchor={ANCHOR}
        counts={COUNTS}
        holidays={new Set(['2030-01-09'])}
        todayKey="2030-01-09"
        lastKey="2030-02-15"
        selectedDay={null}
        onPickDay={jest.fn()}
      />,
    );
    expect(propsOf('2030-01-09').note).toBe('availability.onLeaveNotBookable');
  });

  it('gives no note on an ordinary day or in the month view', () => {
    mount('day');
    expect(propsOf('2030-01-09').note).toBeUndefined();
    mockCells.mockClear();
    mount('month');
    expect(propsOf('2030-01-12').note).toBeUndefined();
  });

  it('reports the day a cell was pressed on', () => {
    const onPickDay = mount('week');
    fireEvent.press(screen.getByTestId('cell-2030-01-10'));
    expect(onPickDay).toHaveBeenCalledWith('2030-01-10');
  });
});
