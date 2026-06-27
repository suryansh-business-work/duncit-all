import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';

import { DobDateField, parseDob } from '@/forms/account-edit/DobDateField';
import { buildYears } from '@/forms/account-edit/DobCalendarSheet';
import type { AccountEditValues } from '@/forms/account-edit/account-edit.types';
import { renderWithProviders } from '@/utils/test-utils';

function Harness({ initial = '', unset = false }: Readonly<{ initial?: string; unset?: boolean }>) {
  const { control } = useForm<AccountEditValues>({
    defaultValues: (unset ? {} : { dob: initial }) as AccountEditValues,
  });
  return <DobDateField control={control} />;
}

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
  it('echoes typed text into the bound field', () => {
    renderWithProviders(<Harness initial="1995-01-01" />);
    expect(screen.getByTestId('field-dob').props.value).toBe('1995-01-01');
    fireEvent.changeText(screen.getByTestId('field-dob'), '1990-02-02');
    expect(screen.getByTestId('field-dob').props.value).toBe('1990-02-02');
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
    expect(screen.getByTestId('field-dob').props.value).toBe('1990-06-10');
  });

  it('seeds the sheet at today when the field is empty', () => {
    renderWithProviders(<Harness />);
    fireEvent.press(screen.getByTestId('dob-open'));
    const year = new Date().getFullYear();
    fireEvent.press(screen.getByTestId('dob-done'));
    expect(screen.getByTestId('field-dob').props.value).toMatch(
      new RegExp(`^${year}-\\d{2}-\\d{2}$`),
    );
  });

  it('closes via the backdrop without changing the value', () => {
    renderWithProviders(<Harness initial="1995-06-15" />);
    fireEvent.press(screen.getByTestId('dob-open'));
    fireEvent.press(screen.getByTestId('dob-sheet-backdrop'));
    expect(screen.queryByTestId('dob-sheet')).toBeNull();
    expect(screen.getByTestId('field-dob').props.value).toBe('1995-06-15');
  });

  it('renders an empty input when the bound value is unset', () => {
    renderWithProviders(<Harness unset />);
    expect(screen.getByTestId('field-dob').props.value).toBe('');
  });
});
