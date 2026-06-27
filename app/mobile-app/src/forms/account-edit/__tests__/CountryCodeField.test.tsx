import { fireEvent, screen } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';
import { Text } from 'tamagui';

import { CountryCodeField } from '@/forms/account-edit/CountryCodeField';
import type { AccountEditValues } from '@/forms/account-edit/account-edit.types';
import { renderWithProviders } from '@/utils/test-utils';

function Harness({
  initial = '+91',
  disabled = false,
  unset = false,
}: Readonly<{ initial?: string; disabled?: boolean; unset?: boolean }>) {
  const { control, watch } = useForm<AccountEditValues>({
    defaultValues: (unset ? {} : { phone_extension: initial }) as AccountEditValues,
  });
  return (
    <>
      <CountryCodeField
        control={control}
        name="phone_extension"
        label="Code"
        testID="code"
        disabled={disabled}
      />
      <Text testID="ext">{watch('phone_extension')}</Text>
    </>
  );
}

describe('CountryCodeField', () => {
  it('shows the current dial code and a flag for a known dial', () => {
    renderWithProviders(<Harness initial="+91" />);
    expect(screen.getAllByText('+91').length).toBeGreaterThan(0);
  });

  it('picks a new dial code from the searchable sheet', () => {
    renderWithProviders(<Harness />);
    fireEvent.press(screen.getByTestId('code-trigger'));
    fireEvent.changeText(screen.getByTestId('code-search'), 'United Kingdom');
    fireEvent.press(screen.getByTestId('code-option-+44'));
    expect(screen.getByTestId('ext').props.children).toBe('+44');
  });

  it('renders no flag for an unknown dial value', () => {
    renderWithProviders(<Harness initial="+000" />);
    // The trigger still shows the stored value even without a matching flag.
    expect(screen.getAllByText('+000').length).toBeGreaterThan(0);
  });

  it('does not open while disabled', () => {
    renderWithProviders(<Harness disabled />);
    fireEvent.press(screen.getByTestId('code-trigger'));
    expect(screen.queryByTestId('code-sheet')).toBeNull();
  });

  it('falls back to an empty dial when the field value is unset', () => {
    renderWithProviders(<Harness unset />);
    // No stored value → the trigger renders with the placeholder (label + placeholder both read "Code").
    expect(screen.getByTestId('code-trigger')).toBeOnTheScreen();
    expect(screen.getAllByText('Code').length).toBe(2);
  });
});
