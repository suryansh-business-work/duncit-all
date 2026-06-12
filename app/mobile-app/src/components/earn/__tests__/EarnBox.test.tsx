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
});
