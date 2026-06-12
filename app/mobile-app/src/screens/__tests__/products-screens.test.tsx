import { screen } from '@testing-library/react-native';

import { ProductsManageScreen } from '@/screens/ProductsManageScreen';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: jest.fn() }) }));

describe('products studio placeholders', () => {
  it('renders the Your Products placeholder', () => {
    renderWithProviders(<ProductsManageScreen />);
    expect(screen.getByTestId('placeholder-screen')).toBeOnTheScreen();
    expect(screen.getAllByText('Your Products').length).toBeGreaterThan(0);
  });
});
