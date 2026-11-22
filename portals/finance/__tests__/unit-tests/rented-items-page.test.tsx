import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import type { RentalDetailLinks } from '@duncit/venue-rentals';
import RentedItemsPage from '../../src/pages/finance/rented-items-page/RentedItemsPage';
import { renderWithProviders } from '../testkit';

const { boardProps } = vi.hoisted(() => ({ boardProps: { current: null as { links?: RentalDetailLinks } | null } }));

// The board itself is the real package's in rented-items-detail.test.tsx; here
// only what this page hands it.
vi.mock('@duncit/venue-rentals', () => ({
  FinanceRentalBookings: (props: { links?: RentalDetailLinks }) => {
    boardProps.current = props;
    return <div data-testid="finance-rental-bookings" />;
  },
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

  it('points a rental’s pod at mWeb and its guest at the Admin console’s user page', () => {
    renderWithProviders(<RentedItemsPage />);

    const links = boardProps.current?.links;
    expect(links?.mwebUrl).toMatch(/^https?:\/\/[^/]+$/);
    expect(links?.profileUrl?.('u 1')).toMatch(/\/users\/u%201$/);
  });
});
