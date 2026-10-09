import { Linking } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';

import { useBrandOrder } from '@/hooks/useBrandOrder';
import { BrandOrderDetailScreen } from '@/screens/BrandOrderDetailScreen';
import { brandOrderState, SCREEN_ORDER } from '@/utils/brand-order-fixture';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: { id: 'o1' } }),
}));
jest.mock('@/hooks/useBrandOrder', () => ({ useBrandOrder: jest.fn() }));
// Anything else a screen asks the server for (the date settings) stays pending.
jest.mock('@/services/graphql.client', () => ({
  graphqlRequest: jest.fn(() => new Promise(() => undefined)),
}));
const mockedOrder = useBrandOrder as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockedOrder.mockReturnValue(brandOrderState());
});

describe('BrandOrderDetailScreen', () => {
  it('shows the order: status, lines, total, ship-to and that it is not booked yet', () => {
    renderWithProviders(<BrandOrderDetailScreen />);
    expect(screen.getByTestId('brand-order-summary')).toHaveTextContent(/Order #DUN-1/);
    expect(screen.getByTestId('brand-order-status')).toHaveTextContent('Order placed');
    expect(screen.getByText(/Collar — Large × 1/)).toBeOnTheScreen();
    expect(screen.getByText(/Leash × 1/)).toBeOnTheScreen();
    expect(screen.getByTestId('brand-order-total')).toHaveTextContent('₹499');
    expect(screen.getByTestId('brand-order-ship-to')).toHaveTextContent(/221B Indiranagar/);
    expect(screen.getByTestId('brand-order-not-booked')).toBeOnTheScreen();
    expect(screen.getByTestId('brand-order-timeline')).toBeOnTheScreen();
  });

  it('offers only booking and the address fix before ShipRocket has the order', () => {
    const desk = brandOrderState();
    mockedOrder.mockReturnValue(desk);
    renderWithProviders(<BrandOrderDetailScreen />);
    expect(screen.getByTestId('brand-order-book')).toHaveTextContent(/Book shipment/);
    expect(screen.getByTestId('brand-order-fix-address')).toBeOnTheScreen();
    expect(screen.queryByTestId('brand-order-documents')).toBeNull();
    expect(screen.queryByTestId('brand-order-open-shiprocket')).toBeNull();
    expect(screen.queryByTestId('brand-order-refresh')).toBeNull();
    fireEvent.press(screen.getByTestId('brand-order-book'));
    expect(desk.book).toHaveBeenCalled();
  });

  it('says why booking stopped, and offers a retry', () => {
    mockedOrder.mockReturnValue(
      brandOrderState({ order: { ...SCREEN_ORDER, last_error: 'Pickup address not verified' } }),
    );
    renderWithProviders(<BrandOrderDetailScreen />);
    expect(screen.getByTestId('brand-order-last-error')).toHaveTextContent(
      'Booking stopped: Pickup address not verified',
    );
    expect(screen.getByTestId('brand-order-book')).toHaveTextContent(/Retry booking/);
  });

  it('once shipped: every ShipRocket fact, both links, the documents and a refresh', () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const desk = brandOrderState({
      order: {
        ...SCREEN_ORDER,
        fulfilment_status: 'SHIPPED',
        shiprocket: {
          ...SCREEN_ORDER.shiprocket,
          order_id: 'SR1',
          shipment_id: 'SH1',
          awb: 'AWB1',
          courier_name: 'Delhivery',
          tracking_status: 'In transit',
          etd: 'Oct 12',
          pickup_scheduled_date: 'Oct 10',
        },
      },
    });
    mockedOrder.mockReturnValue(desk);
    renderWithProviders(<BrandOrderDetailScreen />);
    expect(screen.getByTestId('brand-order-sr-order')).toHaveTextContent('SR1');
    expect(screen.getByTestId('brand-order-sr-shipment')).toHaveTextContent('SH1');
    expect(screen.getByTestId('brand-order-awb')).toHaveTextContent('AWB1');
    expect(screen.getByTestId('brand-order-courier')).toHaveTextContent('Delhivery');
    expect(screen.getByTestId('brand-order-etd')).toHaveTextContent('Oct 12');
    expect(screen.getByTestId('brand-order-pickup-date')).toHaveTextContent('Oct 10');
    expect(screen.getByTestId('brand-order-tracking')).toHaveTextContent('In transit');
    expect(
      screen.getByText('Opens this order in your brand’s ShipRocket account.'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('brand-order-book')).toBeNull();
    expect(screen.queryByTestId('brand-order-fix-address')).toBeNull();

    fireEvent.press(screen.getByTestId('brand-order-track'));
    expect(open).toHaveBeenCalledWith('https://shiprocket.co/tracking/AWB1');
    fireEvent.press(screen.getByTestId('brand-order-open-shiprocket'));
    expect(open).toHaveBeenCalledWith('https://app.shiprocket.in/seller/orders/details/SR1');
    for (const kind of ['LABEL', 'INVOICE', 'MANIFEST']) {
      fireEvent.press(screen.getByTestId(`brand-order-print-${kind}`));
      expect(desk.document).toHaveBeenLastCalledWith(kind, 'print');
      fireEvent.press(screen.getByTestId(`brand-order-download-${kind}`));
      expect(desk.document).toHaveBeenLastCalledWith(kind, 'download');
    }
    fireEvent.press(screen.getByTestId('brand-order-refresh'));
    expect(desk.refreshTracking).toHaveBeenCalled();
    open.mockRestore();
  });

  it('is read-only once cancelled', () => {
    mockedOrder.mockReturnValue(
      brandOrderState({ order: { ...SCREEN_ORDER, cancelled_at: '2026-10-02T00:00:00.000Z' } }),
    );
    renderWithProviders(<BrandOrderDetailScreen />);
    expect(screen.getByTestId('brand-order-cancelled')).toBeOnTheScreen();
    expect(screen.queryByTestId('brand-order-actions')).toBeNull();
  });

  it('has nothing to ship for a pickup order, and no ship-to', () => {
    mockedOrder.mockReturnValue(
      brandOrderState({ order: { ...SCREEN_ORDER, fulfilment_method: 'PICKUP' } }),
    );
    renderWithProviders(<BrandOrderDetailScreen />);
    expect(screen.getByTestId('brand-order-pickup')).toBeOnTheScreen();
    expect(screen.queryByTestId('brand-order-ship-to')).toBeNull();
    expect(screen.queryByTestId('brand-order-actions')).toBeNull();
  });

  it('says an order with no ship-to has none', () => {
    mockedOrder.mockReturnValue(
      brandOrderState({ order: { ...SCREEN_ORDER, shipping_address: null } }),
    );
    renderWithProviders(<BrandOrderDetailScreen />);
    expect(screen.getByTestId('brand-order-ship-to')).toHaveTextContent(/no delivery address yet/);
  });

  it('says what the last action did', () => {
    mockedOrder.mockReturnValue(
      brandOrderState({ notice: { tone: 'success', text: 'Tracking updated.' } }),
    );
    const { unmount } = renderWithProviders(<BrandOrderDetailScreen />);
    expect(screen.getByTestId('brand-order-notice')).toHaveProp('role', 'status');
    unmount();
    mockedOrder.mockReturnValue(brandOrderState({ notice: { tone: 'error', text: 'Nope' } }));
    renderWithProviders(<BrandOrderDetailScreen />);
    expect(screen.getByTestId('brand-order-notice')).toHaveProp('role', 'alert');
  });

  it('shows the load, a failure with a retry, and an order that is not there', () => {
    mockedOrder.mockReturnValue(brandOrderState({ order: null, isLoading: true }));
    const first = renderWithProviders(<BrandOrderDetailScreen />);
    expect(screen.getByTestId('brand-order-loading')).toBeOnTheScreen();
    first.unmount();

    const desk = brandOrderState({ order: null, error: 'Offline' });
    mockedOrder.mockReturnValue(desk);
    const second = renderWithProviders(<BrandOrderDetailScreen />);
    fireEvent.press(screen.getByTestId('brand-order-retry'));
    expect(desk.retry).toHaveBeenCalled();
    second.unmount();

    mockedOrder.mockReturnValue(brandOrderState({ order: null }));
    renderWithProviders(<BrandOrderDetailScreen />);
    expect(screen.getByTestId('brand-order-not-found')).toBeOnTheScreen();
  });
});
