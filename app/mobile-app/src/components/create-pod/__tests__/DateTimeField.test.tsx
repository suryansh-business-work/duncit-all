import { fireEvent, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { DateTimeField } from '@/components/create-pod/DateTimeField';
import { buildMonthDays } from '@/components/create-pod/DateTimeSheet';
import { renderWithProviders } from '@/utils/test-utils';

// No admin settings are loaded, so the field speaks the fallback patterns: the
// typed date half of 'dd MMM yyyy' ('dd MM yyyy') plus 'hh:mm a' — a 12-hour
// clock, so the sheet draws one half's hour chips plus AM/PM.

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
    fireEvent.changeText(screen.getByTestId('field-pod_date_time_text'), '01 07 2026 06:30 pm');
    expect(screen.getByTestId('pod_date_time_text-formatted')).toHaveTextContent(
      '01 07 2026 06:30 PM',
    );
  });

  it('shows no preview for text outside the admin pattern', () => {
    renderWithProviders(<Harness />);
    fireEvent.changeText(screen.getByTestId('field-pod_date_time_text'), '2026-07-01 18:30');
    expect(screen.queryByTestId('pod_date_time_text-formatted')).toBeNull();
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
    renderWithProviders(<Harness initial="15 07 2026 06:30 PM" />);
    fireEvent.press(screen.getByTestId('pod_date_time_text-open'));
    expect(screen.getByTestId('pod_date_time_text-sheet')).toBeOnTheScreen();
    expect(screen.getByText('July 2026')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('pod_date_time_text-day-20'));
    // Seeded at 6 PM, so the AM half is chosen before its 9 o'clock chip shows.
    expect(screen.queryByTestId('pod_date_time_text-hour-9')).toBeNull();
    fireEvent.press(screen.getByTestId('pod_date_time_text-meridiem-AM'));
    fireEvent.press(screen.getByTestId('pod_date_time_text-hour-9'));
    fireEvent.press(screen.getByTestId('pod_date_time_text-minute-45'));
    fireEvent.press(screen.getByTestId('pod_date_time_text-done'));
    expect(screen.queryByTestId('pod_date_time_text-sheet')).toBeNull();
    expect(screen.getByTestId('field-pod_date_time_text').props.value).toBe('20 07 2026 09:45 AM');
  });

  it('navigates months and falls back to a fresh seed without a value', () => {
    renderWithProviders(<Harness />);
    fireEvent.press(screen.getByTestId('pod_date_time_text-open'));
    fireEvent.press(screen.getByTestId('pod_date_time_text-next-month'));
    fireEvent.press(screen.getByTestId('pod_date_time_text-prev-month'));
    fireEvent.press(screen.getByTestId('pod_date_time_text-day-1'));
    fireEvent.press(screen.getByTestId('pod_date_time_text-done'));
    const text = screen.getByTestId('field-pod_date_time_text').props.value as string;
    expect(text).toMatch(/^01 \d{2} \d{4} \d{2}:\d{2} (AM|PM)$/);
  });

  it('closes via the backdrop and snaps odd minutes to 0', () => {
    renderWithProviders(<Harness initial="15 07 2026 06:23 PM" />);
    fireEvent.press(screen.getByTestId('pod_date_time_text-open'));
    fireEvent.press(screen.getByTestId('pod_date_time_text-sheet-backdrop'));
    expect(screen.queryByTestId('pod_date_time_text-sheet')).toBeNull();
    // Reopen and confirm — odd minutes snap to :00.
    fireEvent.press(screen.getByTestId('pod_date_time_text-open'));
    fireEvent.press(screen.getByTestId('pod_date_time_text-done'));
    expect(screen.getByTestId('field-pod_date_time_text').props.value).toBe('15 07 2026 06:00 PM');
  });
});
