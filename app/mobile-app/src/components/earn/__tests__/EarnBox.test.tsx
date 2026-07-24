import { fireEvent, screen } from '@testing-library/react-native';

import { EarnBox } from '@/components/earn/EarnBox';
import { renderWithProviders } from '@/utils/test-utils';

describe('EarnBox', () => {
  it('renders an enabled box and fires onPress', () => {
    const onPress = jest.fn();
    renderWithProviders(
      <EarnBox
        testID="earn-box"
        title="Host"
        description="d"
        icon="dashboard"
        disabled={false}
        onPress={onPress}
      />,
    );
    expect(screen.queryByTestId('earn-box-enabled')).toBeNull();
    fireEvent.press(screen.getByTestId('earn-box'));
    expect(onPress).toHaveBeenCalled();
  });

  it('disables the box and shows the enabled label', () => {
    const onPress = jest.fn();
    renderWithProviders(
      <EarnBox
        testID="earn-box"
        title="Host"
        description="d"
        icon="dashboard"
        disabled
        onPress={onPress}
      />,
    );
    expect(screen.getByTestId('earn-box-enabled')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('earn-box'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows a next-step CTA for an approved role and fires it without navigating the card', () => {
    const onPress = jest.fn();
    const ctaPress = jest.fn();
    renderWithProviders(
      <EarnBox
        testID="earn-box"
        title="Host"
        description="d"
        icon="dashboard"
        disabled
        disabledLabel="Already enabled"
        cta={{ label: 'Ready to host more experiences?', onPress: ctaPress }}
        onPress={onPress}
      />,
    );
    expect(screen.getByTestId('earn-box-enabled')).toBeOnTheScreen();
    expect(screen.getByText('Ready to host more experiences?')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('earn-box-cta'));
    expect(ctaPress).toHaveBeenCalled();
    // The card itself stays non-navigable while disabled.
    fireEvent.press(screen.getByTestId('earn-box'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
