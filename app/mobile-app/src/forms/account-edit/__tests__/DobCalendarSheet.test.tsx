import { fireEvent, screen } from '@testing-library/react-native';

import { DobCalendarSheet } from '@/forms/account-edit/DobCalendarSheet';
import { renderWithProviders } from '@/utils/test-utils';

const maxDate = new Date('2026-06-15T00:00:00');

const renderSheet = (over: Partial<Parameters<typeof DobCalendarSheet>[0]> = {}) => {
  const onDone = jest.fn();
  renderWithProviders(
    <DobCalendarSheet
      testID="dob"
      initial={new Date('1995-06-15T00:00:00')}
      muted="#999"
      maxDate={maxDate}
      onDone={onDone}
      {...over}
    />,
  );
  return onDone;
};

describe('DobCalendarSheet', () => {
  it('navigates months and confirms the selected day', () => {
    const onDone = renderSheet();
    expect(screen.getByText('June 1995')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('dob-next-month'));
    expect(screen.getByText('July 1995')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('dob-prev-month'));
    expect(screen.getByText('June 1995')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('dob-day-20'));
    fireEvent.press(screen.getByTestId('dob-done'));
    expect(onDone).toHaveBeenCalledTimes(1);
    const picked = onDone.mock.calls[0][0] as Date;
    expect(picked.getFullYear()).toBe(1995);
    expect(picked.getDate()).toBe(20);
  });

  it('jumps to a typed/selected year and resets the search', () => {
    renderSheet();
    fireEvent.changeText(screen.getByTestId('dob-year-search'), '1988');
    expect(screen.queryByTestId('dob-year-1995')).toBeNull();
    fireEvent.press(screen.getByTestId('dob-year-1988'));
    expect(screen.getByText('June 1988')).toBeOnTheScreen();
    // Search has been cleared, so other years are listed again.
    expect(screen.getByTestId('dob-year-1995')).toBeOnTheScreen();
  });

  it('shows an empty state for an impossible year query', () => {
    renderSheet();
    fireEvent.changeText(screen.getByTestId('dob-year-search'), '9999');
    expect(screen.getByText('No matching years.')).toBeOnTheScreen();
  });

  it('blocks future days (no-op press) but allows past days', () => {
    const onDone = renderSheet({ initial: maxDate });
    expect(screen.getByText('June 2026')).toBeOnTheScreen();
    // 16 June 2026 is after the 15th max date — pressing it must not select.
    fireEvent.press(screen.getByTestId('dob-day-16'));
    fireEvent.press(screen.getByTestId('dob-done'));
    expect((onDone.mock.calls[0][0] as Date).getDate()).toBe(15);
  });

  it('falls back to maxDate as the seed when no initial value is given', () => {
    const onDone = renderSheet({ initial: null });
    expect(screen.getByText('June 2026')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('dob-day-10'));
    fireEvent.press(screen.getByTestId('dob-done'));
    expect((onDone.mock.calls[0][0] as Date).getMonth()).toBe(5);
  });
});
