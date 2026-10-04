import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useForm } from 'react-hook-form';
import { latestEligibleDob } from '@duncit/datetime';

import { DobDateField, parseDob } from '@/forms/account-edit/DobDateField';
import { buildYears } from '@/forms/account-edit/DobCalendarSheet';
import type { AccountEditValues } from '@/forms/account-edit/account-edit.types';
import { appFormatter } from '@/utils/app-formatter';
import { renderWithProviders } from '@/utils/test-utils';

/** The field shows the admin's typed date pattern but STORES 'YYYY-MM-DD';
 * the harness reads the stored value back so both sides can be checked. */
function Harness({ initial = '', unset = false }: Readonly<{ initial?: string; unset?: boolean }>) {
  const { control, watch } = useForm<AccountEditValues, any, AccountEditValues>({
    defaultValues: (unset ? {} : { dob: initial }) as AccountEditValues,
  });
  return (
    <>
      <DobDateField control={control} />
      <Text testID="stored-dob">{watch('dob') ?? ''}</Text>
    </>
  );
}

const shown = () => screen.getByTestId('field-dob').props.value;
const stored = () => screen.getByTestId('stored-dob').props.children;
/** A stored day as the input renders it (the admin pattern, month in digits). */
const asTyped = (isoDay: string) => appFormatter().formatDayInput(isoDay);

describe('parseDob', () => {
  it('parses a valid date and rejects blank/invalid input', () => {
    expect(parseDob('1995-06-15')?.getFullYear()).toBe(1995);
    expect(parseDob('')).toBeNull();
    expect(parseDob('15/06/1995')).toBeNull();
    expect(parseDob('1995-13-40')).toBeNull();
  });
});

describe('buildYears', () => {
  it('lists the max year first and spans 121 entries (~120 years)', () => {
    const years = buildYears(2026);
    expect(years[0]).toBe(2026);
    expect(years).toHaveLength(121);
    expect(years[years.length - 1]).toBe(2026 - 120);
  });
});

describe('DobDateField', () => {
  it('shows the stored day in the typed pattern and stores a complete typed date as ISO', () => {
    renderWithProviders(<Harness initial="1995-01-01" />);
    expect(shown()).toBe(asTyped('1995-01-01'));
    expect(shown()).not.toBe('1995-01-01');
    fireEvent.changeText(screen.getByTestId('field-dob'), asTyped('1990-02-02'));
    expect(stored()).toBe('1990-02-02');
    expect(shown()).toBe(asTyped('1990-02-02'));
  });

  it('echoes half-typed text exactly as entered', () => {
    renderWithProviders(<Harness initial="1995-01-01" />);
    fireEvent.changeText(screen.getByTestId('field-dob'), '02');
    expect(shown()).toBe('02');
    expect(stored()).toBe('02');
  });

  it('picks a birth date via the calendar sheet (year → month → day)', async () => {
    renderWithProviders(<Harness initial="1995-06-15" />);
    fireEvent.press(screen.getByTestId('dob-open'));
    expect(screen.getByTestId('dob-sheet')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('dob-year-1990'));
    await waitFor(() => expect(screen.getByText('June 1990')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('dob-day-10'));
    fireEvent.press(screen.getByTestId('dob-done'));
    expect(screen.queryByTestId('dob-sheet')).toBeNull();
    expect(stored()).toBe('1990-06-10');
    expect(shown()).toBe(asTyped('1990-06-10'));
  });

  it('seeds the sheet at the latest eligible birthday when the field is empty', () => {
    renderWithProviders(<Harness />);
    fireEvent.press(screen.getByTestId('dob-open'));
    fireEvent.press(screen.getByTestId('dob-done'));
    // The calendar stops at the minimum joining age, so an empty field opens
    // there rather than on today.
    const latest = appFormatter().toIsoDay(latestEligibleDob());
    expect(stored()).toBe(latest);
    expect(shown()).toBe(asTyped(latest));
  });

  it('closes via the backdrop without changing the value', () => {
    renderWithProviders(<Harness initial="1995-06-15" />);
    fireEvent.press(screen.getByTestId('dob-open'));
    fireEvent.press(screen.getByTestId('dob-sheet-backdrop'));
    expect(screen.queryByTestId('dob-sheet')).toBeNull();
    expect(stored()).toBe('1995-06-15');
    expect(shown()).toBe(asTyped('1995-06-15'));
  });

  it('renders an empty input when the bound value is unset', () => {
    renderWithProviders(<Harness unset />);
    expect(shown()).toBe('');
  });
});
