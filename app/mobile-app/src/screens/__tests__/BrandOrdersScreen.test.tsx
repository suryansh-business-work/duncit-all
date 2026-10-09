import { fireEvent, screen } from '@testing-library/react-native';

import { useBrandOrders } from '@/hooks/useBrandOrders';
import { BrandOrdersScreen } from '@/screens/BrandOrdersScreen';
import { BRAND_ORDER_ROW as ROW } from '@/utils/brand-order-fixture';
import { renderWithProviders } from '@/utils/test-utils';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));
jest.mock('@/hooks/useBrandOrders', () => ({ useBrandOrders: jest.fn() }));
// Anything else a screen asks the server for (the date settings) stays pending.
jest.mock('@/services/graphql.client', () => ({
  graphqlRequest: jest.fn(() => new Promise(() => undefined)),
}));
const mockedList = useBrandOrders as jest.Mock;

const listState = (over: Record<string, unknown> = {}) => ({
  rows: [
    ROW,
    {
      ...ROW,
      id: 'o2',
      order_no: 'DUN-2',
      fulfilment_status: 'MYSTERY',
      shiprocket: { awb: 'AWB9' },
    },
  ],
  page: 2,
  pages: 3,
  status: '',
  search: '',
  filtered: false,
  isLoading: false,
  error: null,
  setSearch: jest.fn(),
  setPage: jest.fn(),
  setStatus: jest.fn(),
  retry: jest.fn(),
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedList.mockReturnValue(listState());
});

describe('BrandOrdersScreen', () => {
  it('lists each order with its buyer, item count, status and AWB; a press opens it', () => {
    renderWithProviders(<BrandOrdersScreen />);
    expect(screen.getByTestId('brand-order-o1')).toHaveTextContent(/Order #DUN-1/);
    expect(screen.getByTestId('brand-order-o1')).toHaveTextContent(/Riya · 3 items/);
    expect(screen.getByTestId('brand-order-status-o1')).toHaveTextContent('Fulfilment failed');
    expect(screen.getByTestId('brand-order-awb-o1')).toHaveTextContent('No AWB yet');
    expect(screen.getByTestId('brand-order-awb-o2')).toHaveTextContent('AWB AWB9');
    // A status this app does not know yet still reads, as itself.
    expect(screen.getByTestId('brand-order-status-o2')).toHaveTextContent('MYSTERY');

    fireEvent.press(screen.getByTestId('brand-order-o2'));
    expect(mockNavigate).toHaveBeenCalledWith('BrandOrderDetail', { id: 'o2' });
  });

  it('pages back and forth', () => {
    const desk = listState();
    mockedList.mockReturnValue(desk);
    renderWithProviders(<BrandOrdersScreen />);
    expect(screen.getByTestId('brand-orders-page-of')).toHaveTextContent('Page 2 of 3');
    fireEvent.press(screen.getByTestId('brand-orders-prev'));
    expect(desk.setPage).toHaveBeenCalledWith(1);
    fireEvent.press(screen.getByTestId('brand-orders-next'));
    expect(desk.setPage).toHaveBeenCalledWith(3);
  });

  it('has no pager for a single page', () => {
    mockedList.mockReturnValue(listState({ pages: 1, page: 1 }));
    renderWithProviders(<BrandOrdersScreen />);
    expect(screen.queryByTestId('brand-orders-pager')).toBeNull();
  });

  it('searches and filters by status', () => {
    const desk = listState({ status: 'FAILED' });
    mockedList.mockReturnValue(desk);
    renderWithProviders(<BrandOrdersScreen />);
    fireEvent.changeText(screen.getByTestId('brand-orders-search'), 'DUN-1');
    expect(desk.setSearch).toHaveBeenCalledWith('DUN-1');
    expect(screen.getByTestId('brand-orders-status-FAILED')).toHaveProp('aria-selected', true);
    expect(screen.getByTestId('brand-orders-status-all')).toHaveProp('aria-selected', false);
    fireEvent.press(screen.getByTestId('brand-orders-status-SHIPPED'));
    expect(desk.setStatus).toHaveBeenCalledWith('SHIPPED');
    fireEvent.press(screen.getByTestId('brand-orders-status-all'));
    expect(desk.setStatus).toHaveBeenCalledWith('');
  });

  it('tells a brand with no orders apart from a search that matched none', () => {
    mockedList.mockReturnValue(listState({ rows: [] }));
    const { unmount } = renderWithProviders(<BrandOrdersScreen />);
    expect(screen.getByTestId('brand-orders-empty')).toHaveTextContent(
      /No Pod Shop orders for your brands yet/,
    );
    unmount();
    mockedList.mockReturnValue(listState({ rows: [], filtered: true }));
    renderWithProviders(<BrandOrdersScreen />);
    expect(screen.getByTestId('brand-orders-empty')).toHaveTextContent(/No orders match/);
  });

  it('shows the load, and a failure with a retry', () => {
    mockedList.mockReturnValue(listState({ rows: [], isLoading: true }));
    const { unmount } = renderWithProviders(<BrandOrdersScreen />);
    expect(screen.getByTestId('brand-orders-loading')).toBeOnTheScreen();
    unmount();

    const desk = listState({ rows: [], error: 'Offline' });
    mockedList.mockReturnValue(desk);
    renderWithProviders(<BrandOrdersScreen />);
    expect(screen.getByTestId('brand-orders-error')).toHaveTextContent(/Offline/);
    fireEvent.press(screen.getByTestId('brand-orders-retry'));
    expect(desk.retry).toHaveBeenCalled();
  });
});
