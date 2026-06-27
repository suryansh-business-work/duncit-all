import { screen } from '@testing-library/react-native';

import { ProductsManageScreen } from '@/screens/ProductsManageScreen';
import { useEcommDashboard } from '@/hooks/useStudioDashboards';
import { renderWithProviders } from '@/utils/test-utils';

// The full app header is unit-tested on its own; stub it here (B4-3).
jest.mock('@/components/AppHeader', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View: V } = require('react-native');
  return { AppHeader: () => <V testID="app-header-stub" /> };
});
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: jest.fn() }),
}));
jest.mock('@/hooks/useStudioDashboards', () => ({ useEcommDashboard: jest.fn() }));
const mockedUse = useEcommDashboard as jest.Mock;

const mockFeatureFlag = jest.fn().mockReturnValue(true);
jest.mock('@/hooks/useFeatureFlag', () => ({
  useFeatureFlag: (key: string, fallback?: boolean) => mockFeatureFlag(key, fallback),
}));

beforeEach(() => {
  mockFeatureFlag.mockReturnValue(true);
  mockedUse.mockReturnValue({ isLoading: false, products: [] });
});

describe('ProductsManageScreen (ecomm dashboard)', () => {
  it('shows catalogue stats and the stock chart', () => {
    mockedUse.mockReturnValue({
      isLoading: false,
      products: [
        { id: 'p1', product_name: 'Water bottle', unit_cost: 100, available_count: 8 },
        { id: 'p2', product_name: 'Cap', unit_cost: 300, available_count: 2 },
        { id: 'p3', product_name: 'Sticker', unit_cost: null, available_count: null },
        { id: 'p4', product_name: 'Badge', unit_cost: null, available_count: null },
      ],
    });
    renderWithProviders(<ProductsManageScreen />);
    expect(screen.getByText('Products')).toBeOnTheScreen();
    expect(screen.getByText('₹100')).toBeOnTheScreen();
    expect(screen.getByTestId('ecomm-stock-chart')).toBeOnTheScreen();
  });

  it('shows the loading and empty states', () => {
    mockedUse.mockReturnValue({ isLoading: true, products: [] });
    renderWithProviders(<ProductsManageScreen />);
    expect(screen.getByTestId('ecomm-dashboard-loading')).toBeOnTheScreen();
    expect(screen.getByTestId('ecomm-dashboard-empty')).toBeOnTheScreen();
  });

  it('shows an unavailable placeholder when products are gated off', () => {
    mockFeatureFlag.mockReturnValue(false);
    renderWithProviders(<ProductsManageScreen />);
    expect(screen.getByTestId('products-unavailable')).toBeOnTheScreen();
    expect(screen.queryByTestId('ecomm-stock-chart')).toBeNull();
  });
});
