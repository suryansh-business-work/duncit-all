import { Linking } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { partnerPortalUrl } from '@duncit/onboarding';

import { useBrandWarehouses } from '@/hooks/useBrandWarehouses';
import { BrandWarehousesScreen } from '@/screens/BrandWarehousesScreen';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: jest.fn(), goBack: jest.fn() }),
}));
jest.mock('@/hooks/useBrandWarehouses', () => ({ useBrandWarehouses: jest.fn() }));
const mockedDesk = useBrandWarehouses as jest.Mock;

const READY = {
  id: 'w1',
  nickname: 'Main',
  address_line1: '12 MG Road',
  address_line2: '',
  city: 'Pune',
  state: 'MH',
  pincode: '411001',
  is_default: true,
  review_status: 'APPROVED',
  shiprocket_registered: true,
  shiprocket_error: '',
};
const UNVERIFIED = {
  ...READY,
  id: 'w2',
  nickname: 'Annex',
  address_line1: '',
  city: '',
  state: '',
  pincode: '',
  is_default: false,
  review_status: 'PENDING',
  shiprocket_error: 'Awaiting phone verification in ShipRocket',
};

const deskState = (over: Record<string, unknown> = {}) => ({
  brands: [
    { id: 'b1', brand_name: 'Paws' },
    { id: 'b2', brand_name: 'Tails' },
  ],
  brandId: 'b1',
  warehouses: [READY, UNVERIFIED],
  isLoading: false,
  error: null,
  syncing: false,
  outcome: null,
  syncError: null,
  selectBrand: jest.fn(),
  retry: jest.fn(),
  sync: jest.fn().mockResolvedValue(undefined),
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedDesk.mockReturnValue(deskState());
});

describe('BrandWarehousesScreen', () => {
  it('lists each warehouse with its default, review and ShipRocket standing', () => {
    renderWithProviders(<BrandWarehousesScreen />);
    expect(screen.getByTestId('brand-warehouse-w1')).toHaveTextContent(
      /12 MG Road, Pune, MH, 411001/,
    );
    expect(screen.getByTestId('brand-warehouse-default-w1')).toHaveTextContent('Default');
    expect(screen.getByTestId('brand-warehouse-review-w1')).toHaveTextContent('Approved');
    expect(screen.getByTestId('brand-warehouse-shiprocket-w1')).toHaveTextContent(
      'Registered with ShipRocket',
    );
    expect(screen.queryByTestId('brand-warehouse-default-w2')).toBeNull();
    expect(screen.getByTestId('brand-warehouse-review-w2')).toHaveTextContent('Awaiting approval');
    expect(screen.getByTestId('brand-warehouse-shiprocket-w2')).toHaveTextContent(
      'Awaiting verification in ShipRocket',
    );
    expect(screen.getByTestId('brand-warehouse-error-w2')).toHaveTextContent(/phone verification/);
  });

  it('picks between brands, the current one marked', () => {
    const desk = deskState();
    mockedDesk.mockReturnValue(desk);
    renderWithProviders(<BrandWarehousesScreen />);
    expect(screen.getByTestId('brand-warehouses-brand-b1')).toHaveProp('aria-selected', true);
    fireEvent.press(screen.getByTestId('brand-warehouses-brand-b2'));
    expect(desk.selectBrand).toHaveBeenCalledWith('b2');
  });

  it('shows no picker for a single brand', () => {
    mockedDesk.mockReturnValue(deskState({ brands: [{ id: 'b1', brand_name: 'Paws' }] }));
    renderWithProviders(<BrandWarehousesScreen />);
    expect(screen.queryByTestId('brand-warehouses-brand-b1')).toBeNull();
  });

  it('syncs with ShipRocket and opens the Partner app to add or edit', () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const desk = deskState();
    mockedDesk.mockReturnValue(desk);
    renderWithProviders(<BrandWarehousesScreen />);
    fireEvent.press(screen.getByTestId('brand-warehouses-sync'));
    expect(desk.sync).toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('brand-warehouses-manage'));
    expect(open).toHaveBeenCalledWith(partnerPortalUrl('/ecomm-brand/warehouses'));
    open.mockRestore();
  });

  it('says what a sync found, and how many pickups it took in', () => {
    mockedDesk.mockReturnValue(
      deskState({
        outcome: { warehouses: [], shiprocket_error: '', adopted: 2, synced_at: 'now' },
      }),
    );
    const { unmount } = renderWithProviders(<BrandWarehousesScreen />);
    expect(screen.getByTestId('brand-warehouses-synced')).toHaveTextContent(
      'Synced with ShipRocket. 2 pickup addresses taken in from your ShipRocket account.',
    );
    unmount();

    mockedDesk.mockReturnValue(
      deskState({
        outcome: { warehouses: [], shiprocket_error: '', adopted: 0, synced_at: 'now' },
      }),
    );
    renderWithProviders(<BrandWarehousesScreen />);
    expect(screen.getByTestId('brand-warehouses-synced')).toHaveTextContent(
      /^Synced with ShipRocket\.$/,
    );
  });

  it('says why ShipRocket could not be read, or why the sync did not run', () => {
    mockedDesk.mockReturnValue(
      deskState({
        outcome: { warehouses: [], shiprocket_error: 'Bad token', adopted: 0, synced_at: 'now' },
      }),
    );
    const { unmount } = renderWithProviders(<BrandWarehousesScreen />);
    expect(screen.getByTestId('brand-warehouses-sync-error')).toHaveTextContent(
      'ShipRocket could not be read: Bad token',
    );
    unmount();

    mockedDesk.mockReturnValue(deskState({ syncError: 'Forbidden' }));
    renderWithProviders(<BrandWarehousesScreen />);
    expect(screen.getByTestId('brand-warehouses-sync-error')).toHaveTextContent('Forbidden');
  });

  it('labels the sync while it runs', () => {
    mockedDesk.mockReturnValue(deskState({ syncing: true }));
    renderWithProviders(<BrandWarehousesScreen />);
    expect(screen.getByTestId('brand-warehouses-sync')).toHaveProp(
      'aria-label',
      'Syncing with ShipRocket…',
    );
    expect(screen.getByTestId('brand-warehouses-sync')).toHaveProp('aria-busy', true);
  });

  it('tells a partner with no brand, and a brand with no warehouse, so', () => {
    mockedDesk.mockReturnValue(deskState({ brands: [], brandId: '', warehouses: [] }));
    const { unmount } = renderWithProviders(<BrandWarehousesScreen />);
    expect(screen.getByTestId('brand-warehouses-no-brands')).toBeOnTheScreen();
    expect(screen.queryByTestId('brand-warehouses-sync')).toBeNull();
    unmount();

    mockedDesk.mockReturnValue(deskState({ warehouses: [] }));
    renderWithProviders(<BrandWarehousesScreen />);
    expect(screen.getByTestId('brand-warehouses-empty')).toBeOnTheScreen();
  });

  it('shows the load, and a failure with a retry', () => {
    mockedDesk.mockReturnValue(deskState({ warehouses: [], isLoading: true }));
    const { unmount } = renderWithProviders(<BrandWarehousesScreen />);
    expect(screen.getByTestId('brand-warehouses-loading')).toBeOnTheScreen();
    unmount();

    const desk = deskState({ warehouses: [], error: 'Offline' });
    mockedDesk.mockReturnValue(desk);
    renderWithProviders(<BrandWarehousesScreen />);
    expect(screen.getByTestId('brand-warehouses-error')).toHaveTextContent(/Offline/);
    fireEvent.press(screen.getByTestId('brand-warehouses-retry'));
    expect(desk.retry).toHaveBeenCalled();
  });
});
