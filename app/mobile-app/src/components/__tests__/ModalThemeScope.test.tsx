import { screen } from '@testing-library/react-native';
import { Text } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { renderWithProviders } from '@/utils/test-utils';

describe('ModalThemeScope', () => {
  it('renders its children inside the theme scope', () => {
    renderWithProviders(
      <ModalThemeScope>
        <Text testID="scoped-child">Account</Text>
      </ModalThemeScope>,
    );
    expect(screen.getByTestId('scoped-child')).toBeOnTheScreen();
    expect(screen.getByText('Account')).toBeOnTheScreen();
  });
});
