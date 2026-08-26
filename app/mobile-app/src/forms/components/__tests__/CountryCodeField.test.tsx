import { fireEvent, screen } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';
import { Text } from 'tamagui';

import { CountryCodeField } from '@/forms/components/CountryCodeField';
import type { ContactValueValues } from '@/forms/contact-change/contact-change.types';
import { renderWithProviders } from '@/utils/test-utils';

function Harness({
  initial = '+91',
  disabled = false,
  unset = false,
}: Readonly<{ initial?: string; disabled?: boolean; unset?: boolean }>) {
  // The contact-change dialog is where a country code is picked now: phone and
  // WhatsApp left the edit-profile form when each became its own verified
  // write behind a one-time code.
  const { control, watch } = useForm<ContactValueValues>({
    defaultValues: (unset ? {} : { extension: initial }) as ContactValueValues,
  });
  return (
    <>
      <CountryCodeField
        control={control}
        name="extension"
        label="Code"
        testID="code"
        disabled={disabled}
      />
      <Text testID="ext">{watch('extension')}</Text>
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
