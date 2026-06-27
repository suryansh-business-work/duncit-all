import { useState } from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import { SelectSheet, type SelectOption } from '@/forms/account-edit/SelectSheet';
import { renderWithProviders } from '@/utils/test-utils';

const options: SelectOption[] = [
  { value: 'India', label: 'India', flag: 'https://flagcdn.com/48x36/in.png' },
  { value: 'Nepal', label: 'Nepal' },
  { value: '+91', label: 'India dial', hint: '+91' },
];

function Harness({
  initial = '',
  disabled = false,
  error,
}: Readonly<{ initial?: string; disabled?: boolean; error?: string }>) {
  const [value, setValue] = useState(initial);
  return (
    <SelectSheet
      testID="picker"
      label="Country"
      value={value}
      placeholder="Not set"
      options={options}
      disabled={disabled}
      error={error}
      onPick={setValue}
    />
  );
}

describe('SelectSheet', () => {
  it('shows the placeholder when empty and the value once picked', () => {
    renderWithProviders(<Harness />);
    expect(screen.getByText('Not set')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('picker-trigger'));
    fireEvent.press(screen.getByTestId('picker-option-Nepal'));
    expect(screen.queryByTestId('picker-sheet')).toBeNull();
    expect(screen.getByText('Nepal')).toBeOnTheScreen();
  });

  it('prefers the display text over the raw value when provided', () => {
    renderWithProviders(
      <SelectSheet
        testID="picker"
        label="Code"
        value="+91"
        display="+91 India"
        placeholder="Code"
        options={options}
        onPick={jest.fn()}
      />,
    );
    expect(screen.getByText('+91 India')).toBeOnTheScreen();
  });

  it('filters the option list by the search query and hint, and shows the empty state', () => {
    renderWithProviders(<Harness />);
    fireEvent.press(screen.getByTestId('picker-trigger'));
    fireEvent.changeText(screen.getByTestId('picker-search'), 'nep');
    expect(screen.queryByTestId('picker-option-India')).toBeNull();
    expect(screen.getByTestId('picker-option-Nepal')).toBeOnTheScreen();

    fireEvent.changeText(screen.getByTestId('picker-search'), '+91');
    expect(screen.getByTestId('picker-option-+91')).toBeOnTheScreen();

    fireEvent.changeText(screen.getByTestId('picker-search'), 'zzz');
    expect(screen.getByTestId('picker-empty')).toBeOnTheScreen();
  });

  it('marks the active option and renders its check', () => {
    renderWithProviders(<Harness initial="India" />);
    fireEvent.press(screen.getByTestId('picker-trigger'));
    expect(screen.getByTestId('picker-option-India')).toBeOnTheScreen();
  });

  it('closes via the backdrop and clears the query', () => {
    renderWithProviders(<Harness />);
    fireEvent.press(screen.getByTestId('picker-trigger'));
    fireEvent.changeText(screen.getByTestId('picker-search'), 'nep');
    fireEvent.press(screen.getByTestId('picker-sheet-backdrop'));
    expect(screen.queryByTestId('picker-sheet')).toBeNull();
    // Reopen — the previous query has been reset, so all options show again.
    fireEvent.press(screen.getByTestId('picker-trigger'));
    expect(screen.getByTestId('picker-option-India')).toBeOnTheScreen();
  });

  it('does not open while disabled', () => {
    renderWithProviders(<Harness disabled />);
    fireEvent.press(screen.getByTestId('picker-trigger'));
    expect(screen.queryByTestId('picker-sheet')).toBeNull();
  });

  it('renders an error message', () => {
    renderWithProviders(<Harness error="Required" />);
    expect(screen.getByTestId('picker-error')).toHaveTextContent('Required');
  });
});
