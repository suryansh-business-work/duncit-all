import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import RentedItemsPage from '../../src/pages/finance/rented-items-page/RentedItemsPage';
import { renderWithProviders } from '../testkit';

// The bookings table is the venue-rentals package's own, tested there.
vi.mock('@duncit/venue-rentals', () => ({
  FinanceRentalBookings: () => <div data-testid="finance-rental-bookings" />,
}));

describe('RentedItemsPage', () => {
  it('titles the page and mounts the platform-wide rental bookings under it', () => {
    renderWithProviders(<RentedItemsPage />);

    expect(screen.getByRole('heading', { name: 'Rentals' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Every rented item across the platform: what was paid, how it closed, what the guest is owed and what the venue earns.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId('finance-rental-bookings')).toBeInTheDocument();
  });
});
