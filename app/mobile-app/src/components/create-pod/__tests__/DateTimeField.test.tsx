import { fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { DateTimeField } from '@/components/create-pod/DateTimeField';
import { buildMonthDays } from '@/components/create-pod/DateTimeSheet';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useAppSettings', () => ({
  useAppSettings: () => ({ dateFormat: 'dd MMM yyyy', timeFormat: 'hh:mm a' }),
}));

function Harness({ initial = '' }: Readonly<{ initial?: string }>) {
  const [value, setValue] = useState(initial);
  return (
    <DateTimeField
      label="Start date & time"
      value={value}
      onChange={setValue}
      testID="pod_date_time_text"
    />
  );
}

describe('buildMonthDays', () => {
  it('pads leading blanks and counts the month length', () => {
    // June 2026 starts on a Monday (1 blank) and has 30 days.
    const days = buildMonthDays(2026, 5);
    expect(days[0]).toBeNull();
    expect(days.filter(Boolean)).toHaveLength(30);
  });
});

describe('DateTimeField', () => {
  it('accepts typed text and echoes the admin-format preview', () => {
    renderWithProviders(<Harness />);
    fireEvent.changeText(screen.getByTestId('field-pod_date_time_text'), '2026-07-01 18:30');
    expect(screen.getByTestId('pod_date_time_text-formatted')).toBeOnTheScreen();
    expect(screen.getByText('01 Jul 2026 06:30 PM')).toBeOnTheScreen();
  });

  it('shows the error message', () => {
    renderWithProviders(
      <DateTimeField
        label="Start"
        value=""
        onChange={jest.fn()}
        error="Use YYYY-MM-DD HH:mm"
        testID="pod_date_time_text"
      />,
    );
    expect(screen.getByTestId('pod_date_time_text-error')).toBeOnTheScreen();
  });

  it('picks a date + time from the sheet (seeded from the current value)', () => {
    renderWithProviders(<Harness initial="2026-07-15 18:30" />);
    fireEvent.press(screen.getByTestId('pod_date_time_text-open'));
    expect(screen.getByTestId('pod_date_time_text-sheet')).toBeOnTheScreen();
    expect(screen.getByText('July 2026')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pod_date_time_text-day-20'));
    fireEvent.press(screen.getByTestId('pod_date_time_text-hour-9'));
    fireEvent.press(screen.getByTestId('pod_date_time_text-minute-45'));
    fireEvent.press(screen.getByTestId('pod_date_time_text-done'));
    expect(screen.queryByTestId('pod_date_time_text-sheet')).toBeNull();
    expect(screen.getByTestId('field-pod_date_time_text').props.value).toBe('2026-07-20 09:45');
  });

  it('navigates months and falls back to a fresh seed without a value', () => {
    renderWithProviders(<Harness />);
    fireEvent.press(screen.getByTestId('pod_date_time_text-open'));
    fireEvent.press(screen.getByTestId('pod_date_time_text-next-month'));
    fireEvent.press(screen.getByTestId('pod_date_time_text-prev-month'));
    fireEvent.press(screen.getByTestId('pod_date_time_text-day-1'));
    fireEvent.press(screen.getByTestId('pod_date_time_text-done'));
    const text = screen.getByTestId('field-pod_date_time_text').props.value as string;
    expect(text).toMatch(/^\d{4}-\d{2}-01 \d{2}:\d{2}$/);
  });

  it('closes via the backdrop and snaps odd minutes to 0', () => {
    renderWithProviders(<Harness initial="2026-07-15 18:23" />);
    fireEvent.press(screen.getByTestId('pod_date_time_text-open'));
    fireEvent.press(screen.getByTestId('pod_date_time_text-sheet-backdrop'));
    expect(screen.queryByTestId('pod_date_time_text-sheet')).toBeNull();
    // Reopen and confirm — odd minutes snap to :00.
    fireEvent.press(screen.getByTestId('pod_date_time_text-open'));
    fireEvent.press(screen.getByTestId('pod_date_time_text-done'));
    expect(screen.getByTestId('field-pod_date_time_text').props.value).toBe('2026-07-15 18:00');
  });
});
