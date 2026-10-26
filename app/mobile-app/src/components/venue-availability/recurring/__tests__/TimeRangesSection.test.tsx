import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/utils/test-utils';
import type { TimeRangeRow } from '../recurring-form';
import { TimeRangesSection } from '../TimeRangesSection';

jest.mock('@/hooks/useTranslation', () => {
  const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
    options?.vars ? `${key}|${Object.values(options.vars).join(',')}` : key;
  return { useTranslation: () => ({ t }) };
});
jest.mock('@/hooks/useDateFormat', () => ({
  useDateFormat: () => ({ formatClock: (value: string) => `clock:${value}` }),
}));
// The time sheet is its own component; the stub shows its label and picks 07:00.
jest.mock('@/components/venue-availability/TimePickerField', () => ({
  TimePickerField: ({
    testID,
    label,
    value,
    onChange,
  }: {
    testID: string;
    label: string;
    value: string;
    onChange: (next: string) => void;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable testID={testID} onPress={() => onChange('07:00')}>
        <Text>{`${label}=${value}`}</Text>
      </Pressable>
    );
  },
}));

const ROW_A: TimeRangeRow = { id: 'a', start: '10:00', end: '11:00' };
const ROW_B: TimeRangeRow = { id: 'b', start: '12:00', end: '13:00' };

const mount = (timeSlots: TimeRangeRow[], bufferMinutes = 0) => {
  const onChange = jest.fn();
  renderWithProviders(
    <TimeRangesSection
      timeSlots={timeSlots}
      onChange={onChange}
      openHours={{ open: '08:00', close: '22:00' }}
      bufferMinutes={bufferMinutes}
    />,
  );
  return onChange;
};

describe('TimeRangesSection', () => {
  it('shows one start and end picker per range, labelled plainly for a single range', () => {
    mount([ROW_A]);
    expect(screen.getByText('availability.recurring.start=10:00')).toBeOnTheScreen();
    expect(screen.getByText('availability.recurring.end=11:00')).toBeOnTheScreen();
    expect(screen.queryByTestId('recurring-remove-a')).toBeNull();
  });

  it('numbers the starts when there are several ranges, and lets each be removed', () => {
    mount([ROW_A, ROW_B]);
    expect(screen.getByText('availability.recurring.startN|1=10:00')).toBeOnTheScreen();
    expect(screen.getByText('availability.recurring.startN|2=12:00')).toBeOnTheScreen();
    expect(screen.getByTestId('recurring-remove-a')).toBeOnTheScreen();
    expect(screen.getByTestId('recurring-remove-b')).toBeOnTheScreen();
  });

  it('changes the start of one range only', () => {
    const onChange = mount([ROW_A, ROW_B]);
    fireEvent.press(screen.getByTestId('recurring-start-b'));
    expect(onChange).toHaveBeenCalledWith([ROW_A, { ...ROW_B, start: '07:00' }]);
  });

  it('changes the end of one range only', () => {
    const onChange = mount([ROW_A, ROW_B]);
    fireEvent.press(screen.getByTestId('recurring-end-a'));
    expect(onChange).toHaveBeenCalledWith([{ ...ROW_A, end: '07:00' }, ROW_B]);
  });

  it('adds a new afternoon range after the existing ones', () => {
    const onChange = mount([ROW_A]);
    fireEvent.press(screen.getByTestId('recurring-add-range'));
    const next = onChange.mock.calls[0][0] as TimeRangeRow[];
    expect(next).toHaveLength(2);
    expect(next[0]).toBe(ROW_A);
    expect(next[1]).toMatchObject({ start: '15:00', end: '16:00' });
    expect(next[1]?.id).not.toBe('a');
  });

  it('removes the chosen range', () => {
    const onChange = mount([ROW_A, ROW_B]);
    fireEvent.press(screen.getByTestId('recurring-remove-a'));
    expect(onChange).toHaveBeenCalledWith([ROW_B]);
  });

  it('states the venue hours on the admin clock and that ranges must not overlap', () => {
    mount([ROW_A], 0);
    expect(
      screen.getByText(
        'availability.recurring.venueHours|clock:08:00,clock:22:00 availability.recurring.noOverlap',
      ),
    ).toBeOnTheScreen();
  });

  it('states the buffer gap the venue keeps between ranges', () => {
    mount([ROW_A], 15);
    expect(screen.getByText(/availability.recurring.keepGap\|15/)).toBeOnTheScreen();
    expect(screen.queryByText(/noOverlap/)).toBeNull();
  });
});
