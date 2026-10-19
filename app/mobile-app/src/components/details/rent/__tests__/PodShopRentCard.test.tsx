import { fireEvent, screen, within } from '@testing-library/react-native';
import { Text } from 'tamagui';

import { PodShopRentCard } from '@/components/details/rent/PodShopRentCard';
import type { PodRentals } from '@/hooks/usePodRentals';
import type { PodRentalPicks } from '@/stores/rental-picks.store';
import { renderWithProviders } from '@/utils/test-utils';

const rentals: PodRentals = {
  catalogue: {
    open: true,
    closed_reason: null,
    hours: 2,
    currency_symbol: '₹',
    venue_terms_html: '',
    items: ['a', 'b', 'c'].map((id) => ({
      id,
      name: `Item ${id}`,
      description: '',
      images: [],
      unit: 'SLOT' as const,
      rate: 100,
      deposit: 0,
      available: 3,
      per_guest_limit: 1,
    })),
  },
  settings: null,
  failed: false,
  loading: false,
  refetch: jest.fn(),
};
const picks: PodRentalPicks = { picks: {}, setQuantity: jest.fn(), clear: jest.fn() };
const shop = <Text testID="pod-shop-body">Shop items</Text>;

const renderCard = (hasProducts: boolean) =>
  renderWithProviders(
    <PodShopRentCard
      podTitle="Sunday Smash"
      hasProducts={hasProducts}
      shop={shop}
      rentals={rentals}
      picks={picks}
      seats={1}
    />,
  );

describe('PodShopRentCard', () => {
  it('opens on Pod Shop when the pod sells products, and switches to Pod Rent', () => {
    renderCard(true);
    expect(screen.getByTestId('pod-shop-body')).toBeOnTheScreen();
    expect(screen.queryByTestId('pod-rent-list')).toBeNull();

    fireEvent.press(screen.getByTestId('pod-shop-rent-tab-rent'));

    expect(screen.queryByTestId('pod-shop-body')).toBeNull();
    // The card previews the first two rentals; See all has the rest.
    expect(screen.getByTestId('pod-rent-row-a')).toBeOnTheScreen();
    expect(screen.getByTestId('pod-rent-row-b')).toBeOnTheScreen();
    expect(screen.queryByTestId('pod-rent-row-c')).toBeNull();
  });

  it('titles the card Pod Shop and offers the switch only when the pod both sells and rents', () => {
    renderCard(true);
    expect(
      within(screen.getByTestId('pod-shop-rent')).getAllByText('Pod Shop').length,
    ).toBeGreaterThan(0);
    expect(screen.getByTestId('pod-shop-rent-tab-shop')).toBeOnTheScreen();
    expect(screen.getByTestId('pod-shop-rent-tab-rent')).toBeOnTheScreen();
  });

  it('is simply "Pod Rent", with no switch at all, when the pod sells nothing', () => {
    renderCard(false);
    expect(screen.getByText('Pod Rent')).toBeOnTheScreen();
    expect(screen.queryByText('Pod Shop')).toBeNull();
    // A single-option toggle is noise: neither tab is drawn.
    expect(screen.queryByTestId('pod-shop-rent-tab-shop')).toBeNull();
    expect(screen.queryByTestId('pod-shop-rent-tab-rent')).toBeNull();
    expect(screen.getByTestId('pod-rent-list')).toBeOnTheScreen();
  });

  it('See all opens a sheet named for the pod with its shop and every rental', () => {
    renderCard(true);
    fireEvent.press(screen.getByTestId('pod-shop-rent-see-all'));

    const sheet = screen.getByTestId('pod-shop-rent-sheet');
    expect(within(sheet).getByText('Shop and rent for Sunday Smash')).toBeOnTheScreen();
    expect(within(sheet).getByTestId('pod-shop-body')).toBeOnTheScreen();
    expect(within(sheet).getByTestId('pod-rent-row-c')).toBeOnTheScreen();
  });

  it('leaves the shop out of the sheet when the pod sells nothing', () => {
    renderCard(false);
    fireEvent.press(screen.getByTestId('pod-shop-rent-see-all'));
    const sheet = screen.getByTestId('pod-shop-rent-sheet');
    expect(within(sheet).queryByTestId('pod-shop-body')).toBeNull();
    expect(within(sheet).getByTestId('pod-rent-row-c')).toBeOnTheScreen();
    // The card already says Pod Rent, so the sheet repeats no sub-heading.
    expect(within(sheet).queryByText('Pod Rent')).toBeNull();
  });
});
