import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { RentalBookingsPanel } from '@/components/venue-rentals-desk/RentalBookingsPanel';
import { useVenueRentalBookings } from '@/hooks/useVenueRentalDesk';
import { renderWithProviders } from '@/utils/test-utils';

jest.mock('@/hooks/useVenueRentalDesk', () => ({ useVenueRentalBookings: jest.fn() }));

const mockBookings = useVenueRentalBookings as jest.Mock;

const row = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  name: `Racket ${id}`,
  status: 'BOOKED',
  pod_title: 'Sunday Smash',
  guest_name: 'Asha',
  created_at: '2026-10-10T10:00:00.000Z',
  currency_symbol: '₹',
  unit: 'SLOT',
  units: 1,
  quantity: 1,
  rent_amount: 300,
  deposit_amount: 500,
  ...over,
});
const STATS = {
  bookings: 4,
  open: 2,
  rent_total: 1200,
  deposits_held: 1000,
  earned: 900,
  paid_out: 0,
  currency_symbol: '₹',
};

const serve = (over: Record<string, unknown> = {}) => {
  const value = {
    bookings: [row('b1'), row('b2', { status: 'RETURNED', deposit_amount: 0, guest_name: '' })],
    stats: STATS,
    failed: false,
    loading: false,
    refetch: jest.fn().mockResolvedValue(undefined),
    mark: jest.fn().mockResolvedValue(undefined),
    ...over,
  };
  mockBookings.mockReturnValue(value);
  return value;
};

beforeEach(() => mockBookings.mockReset());

describe('RentalBookingsPanel', () => {
  it('shows the venue’s numbers over its bookings on the dashboard', () => {
    serve();
    renderWithProviders(<RentalBookingsPanel venueId="v1" withStats />);

    expect(mockBookings).toHaveBeenCalledWith('v1');
    expect(screen.getByTestId('venue-rental-stat-bookings')).toHaveTextContent(/Bookings\s*4/);
    expect(screen.getByTestId('venue-rental-stat-open')).toHaveTextContent(/Items out\s*2/);
    expect(screen.getByTestId('venue-rental-stat-earned')).toHaveTextContent(/Earned.*900/);
    expect(screen.getByTestId('venue-rental-stat-paid_out')).toHaveTextContent(
      /Raised for payout.*0/,
    );
  });

  it('lists each booking with its pod, guest, units, rent and deposit', () => {
    serve();
    renderWithProviders(<RentalBookingsPanel venueId="v1" withStats={false} />);

    expect(screen.queryByTestId('venue-rental-stats')).toBeNull();
    const first = screen.getByTestId('venue-rental-b1');
    expect(first).toHaveTextContent(/Racket b1/);
    expect(first).toHaveTextContent(/Booked/);
    expect(first).toHaveTextContent(/Sunday Smash · Asha · /);
    expect(first).toHaveTextContent(/1 × 1 per slot · ₹\s?300 · Deposit ₹\s?500/);
    // A guest with no name is left out rather than shown as a blank.
    expect(screen.getByTestId('venue-rental-b2')).not.toHaveTextContent(/Smash ·\s+·/);
  });

  it('offers Mark only on a rental still out, and marks it through the sheet', async () => {
    const value = serve();
    renderWithProviders(<RentalBookingsPanel venueId="v1" withStats={false} />);
    expect(screen.queryByTestId('venue-rental-b2-mark')).toBeNull();

    fireEvent.press(screen.getByTestId('venue-rental-b1-mark'));
    expect(screen.getByTestId('mark-rental-sheet')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('mark-rental-save'));

    await waitFor(() =>
      expect(value.mark).toHaveBeenCalledWith('b1', {
        outcome: 'RETURNED',
        damage_claim: null,
        note: null,
      }),
    );
    await waitFor(() => expect(screen.queryByTestId('mark-rental-sheet')).toBeNull());
  });

  it('says there are no rentals yet', () => {
    serve({ bookings: [] });
    renderWithProviders(<RentalBookingsPanel venueId="v1" withStats />);
    expect(screen.getByTestId('venue-rentals-empty')).toBeOnTheScreen();
  });

  it('shows the numbers alone while the list has not arrived', () => {
    serve({ bookings: null });
    renderWithProviders(<RentalBookingsPanel venueId="v1" withStats />);
    expect(screen.getByTestId('venue-rental-stats')).toBeOnTheScreen();
    expect(screen.queryByTestId('venue-rentals-empty')).toBeNull();
  });

  it('says the desk could not load, and Retry asks again — a failed retry keeps the notice', async () => {
    const value = serve({ bookings: null, stats: null, failed: true });
    renderWithProviders(<RentalBookingsPanel venueId="v1" withStats />);
    expect(screen.getByTestId('venue-rentals-error')).toHaveTextContent(
      'The rented items could not load',
    );

    fireEvent.press(screen.getByTestId('venue-rentals-error-retry'));
    expect(value.refetch).toHaveBeenCalledTimes(1);

    value.refetch.mockRejectedValueOnce(new Error('offline'));
    fireEvent.press(screen.getByTestId('venue-rentals-error-retry'));
    await waitFor(() => expect(value.refetch).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('venue-rentals-error')).toBeOnTheScreen();
  });

  it('keeps the list on screen when a later reload fails', () => {
    serve({ failed: true });
    renderWithProviders(<RentalBookingsPanel venueId="v1" withStats={false} />);
    expect(screen.queryByTestId('venue-rentals-error')).toBeNull();
    expect(screen.getByTestId('venue-rental-b1')).toBeOnTheScreen();
  });
});
