import { fireEvent, screen, userEvent } from '@testing-library/react-native';

import { renderWithProviders } from '@/utils/test-utils';
import { AvailabilityDayCell } from '../AvailabilityDayCell';
import type { DayCellState, DayCounts } from '../availability-grid';

const KEY = '2030-01-09';

const mount = (
  props: Partial<{
    state: DayCellState;
    selected: boolean;
    isToday: boolean;
    note: string;
    counts: DayCounts;
    onPress: (key: string) => void;
  }> = {},
) => {
  const onPress = props.onPress ?? jest.fn();
  renderWithProviders(
    <AvailabilityDayCell
      dayKey={KEY}
      label="9"
      state="open"
      selected={false}
      isToday={false}
      leaveTag="LEAVE"
      {...props}
      onPress={onPress}
    />,
  );
  return onPress;
};

const cell = () => screen.getByTestId(`availability-day-${KEY}`);

describe('AvailabilityDayCell', () => {
  it('shows the day label as an unselected radio named by its date', () => {
    mount();
    expect(screen.getByText('9')).toBeOnTheScreen();
    expect(cell().props['aria-checked']).toBe(false);
    expect(cell().props['aria-label']).toBe(KEY);
  });

  it('reports its date when pressed', () => {
    const onPress = mount();
    fireEvent.press(cell());
    expect(onPress).toHaveBeenCalledWith(KEY);
  });

  it('marks the picked day as checked', () => {
    mount({ selected: true });
    expect(cell().props['aria-checked']).toBe(true);
  });

  it('is inert on a past or out-of-window day', async () => {
    const onPress = mount({ state: 'disabled' });
    expect(cell().props['aria-disabled']).toBe(true);
    await userEvent.setup().press(cell());
    expect(onPress).not.toHaveBeenCalled();
  });

  it('is pressable on an open day and a holiday', () => {
    expect(mount({ state: 'open' })).toBeDefined();
    expect(cell().props['aria-disabled']).toBe(false);
  });

  it('wears the leave tag on a holiday in the month and week cells', () => {
    mount({ state: 'holiday' });
    expect(screen.getByText('LEAVE')).toBeOnTheScreen();
    expect(cell().props['aria-disabled']).toBe(false);
  });

  it('shows no leave tag on an ordinary day', () => {
    mount();
    expect(screen.queryByText('LEAVE')).toBeNull();
  });

  it('spells out the holiday note in the day view instead of the tag', () => {
    mount({ state: 'holiday', note: 'Closed for Diwali' });
    expect(screen.getByText('Closed for Diwali')).toBeOnTheScreen();
    expect(screen.queryByText('LEAVE')).toBeNull();
  });

  it('shows a note on a day that is not marked as a holiday too', () => {
    mount({ note: 'Maintenance' });
    expect(screen.getByText('Maintenance')).toBeOnTheScreen();
  });

  it('shows each status count with its mark, and hides the zero ones', () => {
    mount({ counts: { available: 3, pending: 0, booked: 2, blocked: 1 } });
    expect(screen.getByText('A3')).toBeOnTheScreen();
    expect(screen.getByText('B2')).toBeOnTheScreen();
    expect(screen.getByText('×1')).toBeOnTheScreen();
    expect(screen.queryByText('P0')).toBeNull();
    expect(screen.queryByText(/^P/)).toBeNull();
  });

  it('shows the pending count too', () => {
    mount({ counts: { available: 0, pending: 4, booked: 0, blocked: 0 } });
    expect(screen.getByText('P4')).toBeOnTheScreen();
    expect(screen.queryByText(/^A/)).toBeNull();
  });

  it('shows no badges for a day without counts', () => {
    mount();
    expect(screen.queryByText(/^[APB×]\d/)).toBeNull();
  });

  it('keeps the counts readable on the picked day', () => {
    mount({ selected: true, counts: { available: 1, pending: 1, booked: 1, blocked: 1 } });
    expect(screen.getByText('A1')).toBeOnTheScreen();
    expect(screen.getByText('×1')).toBeOnTheScreen();
  });

  it('draws today bolder than other days', () => {
    mount({ isToday: true });
    expect(screen.UNSAFE_getByProps({ children: '9' }).props.fontWeight).toBe('700');
  });

  it('draws an ordinary day at the regular weight', () => {
    mount();
    expect(screen.UNSAFE_getByProps({ children: '9' }).props.fontWeight).toBe('600');
  });
});
