import { fireEvent, screen, userEvent } from '@testing-library/react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { renderWithProviders } from '@/utils/test-utils';

describe('PrimaryButton', () => {
  it('renders the label', () => {
    renderWithProviders(<PrimaryButton testID="btn" label="Tap me" onPress={jest.fn()} />);
    expect(screen.getByText('Tap me')).toBeOnTheScreen();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    renderWithProviders(<PrimaryButton testID="btn" label="Tap me" onPress={onPress} />);
    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  // userEvent presses the way a finger does — only through host views — so a
  // disabled button that drops its handler cannot be reached through the
  // component's own props, which fireEvent would walk into.
  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    renderWithProviders(<PrimaryButton testID="btn" label="Tap me" onPress={onPress} disabled />);
    const button = screen.getByTestId('btn');
    expect(button).toBeDisabled();
    await userEvent.setup().press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows a spinner and blocks presses while loading', async () => {
    const onPress = jest.fn();
    renderWithProviders(<PrimaryButton testID="btn" label="Tap me" onPress={onPress} loading />);
    expect(screen.getByTestId('btn-spinner')).toBeOnTheScreen();
    expect(screen.queryByText('Tap me')).toBeNull();
    const button = screen.getByTestId('btn');
    expect(button).toBeDisabled();
    expect(button).toHaveProp('aria-busy', true);
    await userEvent.setup().press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});
