import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { MyRentedItemsScreen } from '@/screens/MyRentedItemsScreen';
import { graphqlRequest } from '@/services/graphql.client';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: jest.fn(), navigate: jest.fn() }),
}));

const mockRequest = graphqlRequest as jest.Mock;

const rental = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  currency_symbol: '₹',
  pod_title: 'Sunday Smash',
  name: `Racket ${id}`,
  image_url: null,
  unit: 'HOUR',
  units: 2,
  quantity: 1,
  rent_amount: 300,
  deposit_amount: 0,
  status: 'BOOKED',
  damage_claim: 0,
  refund_due: 0,
  refund_status: 'NONE',
  created_at: '2026-10-10T10:00:00.000Z',
  ...over,
});

const respond = (rows: unknown[]) => mockRequest.mockResolvedValue({ myRentalBookings: rows });

beforeEach(() => mockRequest.mockReset());

describe('MyRentedItemsScreen', () => {
  it('lists each rental with its pod, units, rent and deposit, asking for the first page', async () => {
    respond([rental('r1', { deposit_amount: 500, quantity: 2 })]);
    renderWithProviders(<MyRentedItemsScreen />);

    expect(screen.getByTestId('rented-items-screen')).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByTestId('rented-item-r1')).toBeOnTheScreen());
    expect(screen.getByText('Racket r1')).toBeOnTheScreen();
    expect(screen.getByText('Booked')).toBeOnTheScreen();
    expect(screen.getByText(/For Sunday Smash/)).toBeOnTheScreen();
    expect(screen.getByText(/2 × 2 per hour · ₹\s?300 · Deposit ₹\s?500/)).toBeOnTheScreen();
    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      { limit: 20, offset: 0 },
      { auth: true },
    );
    // An open rental has no outcome yet, and a short page offers no "Load more".
    expect(screen.queryByText(/Refund/)).toBeNull();
    expect(screen.queryByTestId('rented-items-more')).toBeNull();
  });

  it('says how each closed rental ended: refunded, refund due, or deposit kept for damage', async () => {
    respond([
      rental('paid', { status: 'RETURNED', refund_status: 'PAID', refund_due: 500 }),
      rental('inpay', { status: 'CANCELLED', refund_status: 'IN_PAYMENT', refund_due: 800 }),
      rental('due', { status: 'UNAVAILABLE', refund_status: 'DUE', refund_due: 300 }),
      rental('kept', { status: 'DAMAGED', refund_status: 'NONE', damage_claim: 200 }),
    ]);
    renderWithProviders(<MyRentedItemsScreen />);

    await waitFor(() => expect(screen.getByTestId('rented-item-kept')).toBeOnTheScreen());
    expect(screen.getByText(/Refunded ₹\s?500 · Refunded$/)).toBeOnTheScreen();
    expect(screen.getByText(/Refunded ₹\s?800 · Refunded with the booking/)).toBeOnTheScreen();
    expect(screen.getByText(/Refund due ₹\s?300 · Refund due/)).toBeOnTheScreen();
    expect(screen.getByText(/₹\s?200 kept for damage · No refund/)).toBeOnTheScreen();
  });

  it('shows the empty state when nothing was ever rented', async () => {
    respond([]);
    renderWithProviders(<MyRentedItemsScreen />);
    await waitFor(() => expect(screen.getByTestId('rented-items-empty')).toBeOnTheScreen());
    expect(screen.getByText('You have not rented anything yet')).toBeOnTheScreen();
  });

  it('says the list could not load, and Retry loads it again', async () => {
    mockRequest.mockRejectedValueOnce(new Error('offline'));
    renderWithProviders(<MyRentedItemsScreen />);

    await waitFor(() =>
      expect(screen.getByText('The rented items could not load')).toBeOnTheScreen(),
    );
    respond([rental('r1')]);
    fireEvent.press(screen.getByText('Retry'));

    await waitFor(() => expect(screen.getByTestId('rented-item-r1')).toBeOnTheScreen());
    expect(screen.queryByText('The rented items could not load')).toBeNull();
  });

  it('offers "Load more" on a full page and asks for the next twenty', async () => {
    respond(Array.from({ length: 20 }, (_, i) => rental(`r${i}`)));
    renderWithProviders(<MyRentedItemsScreen />);

    await waitFor(() => expect(screen.getByTestId('rented-items-more')).toBeOnTheScreen());
    fireEvent.press(screen.getByTestId('rented-items-more'));

    await waitFor(() =>
      expect(mockRequest).toHaveBeenLastCalledWith(
        expect.anything(),
        { limit: 40, offset: 0 },
        { auth: true },
      ),
    );
  });
});
