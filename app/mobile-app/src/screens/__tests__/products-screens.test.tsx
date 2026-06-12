import { screen } from '@testing-library/react-native';

import { ProductsManageScreen } from '@/screens/ProductsManageScreen';
import { ProductsVerificationScreen } from '@/screens/ProductsVerificationScreen';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: jest.fn() }) }));

describe('products studio placeholders', () => {
  it('renders the Your Products placeholder', () => {
    renderWithProviders(<ProductsManageScreen />);
    expect(screen.getByTestId('placeholder-screen')).toBeOnTheScreen();
    expect(screen.getAllByText('Your Products').length).toBeGreaterThan(0);
  });

  it('renders the seller verification placeholder', () => {
    renderWithProviders(<ProductsVerificationScreen />);
    expect(screen.getByTestId('placeholder-screen')).toBeOnTheScreen();
    expect(screen.getAllByText('Seller verification').length).toBeGreaterThan(0);
  });
});
