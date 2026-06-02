import { fireEvent, render, screen } from '@testing-library/react-native';

import { PrimaryButton } from '@/components/PrimaryButton';

describe('PrimaryButton', () => {
  it('renders the label', () => {
    render(<PrimaryButton testID="btn" label="Tap me" onPress={jest.fn()} />);
    expect(screen.getByText('Tap me')).toBeOnTheScreen();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<PrimaryButton testID="btn" label="Tap me" onPress={onPress} />);
    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    render(<PrimaryButton testID="btn" label="Tap me" onPress={onPress} disabled />);
    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows a spinner and blocks presses while loading', () => {
    const onPress = jest.fn();
    render(<PrimaryButton testID="btn" label="Tap me" onPress={onPress} loading />);
    expect(screen.getByTestId('btn-spinner')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
