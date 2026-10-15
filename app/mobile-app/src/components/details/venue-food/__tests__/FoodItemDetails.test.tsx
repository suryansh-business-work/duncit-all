import { fireEvent, screen } from '@testing-library/react-native';
import type { VenueFoodItem } from '@duncit/utils';

import { FoodItemDetails } from '@/components/details/venue-food/FoodItemDetails';
import { useFoodCart } from '@/hooks/useFoodCart';
import type { PublicVenueDetails } from '@/hooks/useHostsVenues';
import { renderWithProviders } from '@/utils/test-utils';

// The cart (device storage, pricing) and the venue rating (its own request)
// have their own specs; this one is about what the dish screen shows and wires.
jest.mock('@/hooks/useFoodCart', () => ({ useFoodCart: jest.fn() }));
jest.mock('@/hooks/usePublicFinance', () => ({
  usePublicFinance: () => ({ currency: '₹', gstPct: 0 }),
}));
jest.mock('@/components/details/venue-food/FoodRatingBadge', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return {
    FoodRatingBadge: ({ venueId }: { venueId: string }) => (
      <Text testID="food-rating-badge">{venueId}</Text>
    ),
  };
});

const mockUseFoodCart = useFoodCart as jest.Mock;
const setQuantity = jest.fn();

const dish = (over: Partial<VenueFoodItem> = {}): VenueFoodItem => ({
  id: 'chai',
  name: 'Masala Chai',
  description: '',
  category: 'Drinks',
  price: 120,
  images: [],
  diet: 'VEG',
  spice_level: 'NONE',
  is_available: true,
  ...over,
});

const venueWith = (item: VenueFoodItem, enabled = true) =>
  ({
    id: 'v1',
    venue_name: 'Sunset Cafe',
    food_menu: [item],
    food_ordering: { enabled, discount_pct: 10 },
  }) as unknown as PublicVenueDetails;

const cart = (quantity: number, over: { hydrated?: boolean; atMaxLines?: boolean } = {}) =>
  mockUseFoodCart.mockReturnValue({
    quantityOf: (id: string) => (id === 'chai' ? quantity : 0),
    setQuantity,
    hydrated: true,
    atMaxLines: false,
    ...over,
  });

beforeEach(() => {
  jest.clearAllMocks();
  cart(0);
});

describe('FoodItemDetails', () => {
  it('shows the dish: name, marks, price, rating, description and videos, on the venue cart', () => {
    const item = dish({
      description: 'Ginger and cardamom.',
      original_price: 150,
      videos: ['https://youtu.be/dQw4w9WgXcQ'],
    });
    const venue = venueWith(item);
    renderWithProviders(<FoodItemDetails venue={venue} item={item} />);

    expect(screen.getByTestId('food-item-details-chai')).toBeOnTheScreen();
    expect(screen.getByRole('heading', { name: 'Masala Chai' })).toBeOnTheScreen();
    expect(screen.getByTestId('food-item-price-chai')).toHaveTextContent('₹120');
    expect(screen.getByTestId('food-item-saving-chai')).toHaveTextContent('20% off');
    expect(screen.getByTestId('food-rating-badge')).toHaveTextContent('v1');
    expect(screen.getByText('Ginger and cardamom.')).toBeOnTheScreen();
    expect(screen.getByTestId('food-item-videos-chai')).toBeOnTheScreen();
    expect(screen.queryByTestId('food-item-details-unavailable')).toBeNull();
    // The same per-venue cart the menu uses, priced with the venue's ordering.
    expect(mockUseFoodCart).toHaveBeenCalledWith('v1', venue.food_menu, 10, venue.food_ordering);
  });

  it('opens the viewer from the cover photo and from each thumbnail, and closes it', () => {
    const item = dish({ images: ['http://x/a.jpg', 'http://x/b.jpg'] });
    renderWithProviders(<FoodItemDetails venue={venueWith(item)} item={item} />);

    expect(screen.getByTestId('food-item-thumbs')).toBeOnTheScreen();
    // The cover plus one thumbnail per photo.
    const photos = screen.getAllByLabelText('View the photo of Masala Chai');
    expect(photos).toHaveLength(3);
    const [cover, , lastThumb] = photos;
    if (!cover || !lastThumb) throw new Error('expected a cover and two thumbnails');
    expect(screen.queryByTestId('image-viewer')).toBeNull();

    fireEvent.press(cover);
    expect(screen.getByTestId('image-viewer')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('image-viewer-close'));
    expect(screen.queryByTestId('image-viewer')).toBeNull();

    fireEvent.press(lastThumb);
    expect(screen.getByTestId('image-viewer')).toBeOnTheScreen();
  });

  it('shows a placeholder and no thumbnails without photos, and no strip for a single one', () => {
    const bare = dish();
    const { rerender } = renderWithProviders(
      <FoodItemDetails venue={venueWith(bare)} item={bare} />,
    );
    expect(screen.queryByLabelText('View the photo of Masala Chai')).toBeNull();
    expect(screen.queryByTestId('food-item-thumbs')).toBeNull();

    const single = dish({ images: ['http://x/a.jpg'] });
    rerender(<FoodItemDetails venue={venueWith(single)} item={single} />);
    expect(screen.getAllByLabelText('View the photo of Masala Chai')).toHaveLength(1);
    expect(screen.queryByTestId('food-item-thumbs')).toBeNull();
  });

  it('adds the dish to the cart and steps it, announcing the first unit', () => {
    const item = dish();
    const venue = venueWith(item);
    const { rerender } = renderWithProviders(<FoodItemDetails venue={venue} item={item} />);

    expect(screen.queryByTestId('food-item-details-chai-notice')).toBeNull();
    fireEvent.press(screen.getByTestId('food-item-details-chai-add'));
    expect(setQuantity).toHaveBeenLastCalledWith('chai', 1);

    cart(2);
    rerender(<FoodItemDetails venue={venue} item={item} />);
    expect(screen.getByTestId('food-item-details-chai-notice')).toHaveTextContent('Item added');
    expect(screen.getByTestId('food-item-details-chai-count')).toHaveTextContent('2');
    fireEvent.press(screen.getByTestId('food-item-details-chai-increase'));
    expect(setQuantity).toHaveBeenLastCalledWith('chai', 3);
  });

  it('holds the control until the saved cart has loaded', () => {
    cart(0, { hydrated: false });
    const item = dish();
    renderWithProviders(<FoodItemDetails venue={venueWith(item)} item={item} />);

    const add = screen.getByTestId('food-item-details-chai-add');
    expect(add.props['aria-disabled']).toBe(true);
    fireEvent.press(add);
    expect(setQuantity).not.toHaveBeenCalled();
  });

  it('marks a dish that is off today and offers no control for it', () => {
    const item = dish({ is_available: false });
    renderWithProviders(<FoodItemDetails venue={venueWith(item)} item={item} />);

    expect(screen.getByTestId('food-item-details-unavailable')).toHaveTextContent('Unavailable');
    expect(screen.queryByTestId('food-item-details-chai-add')).toBeNull();
  });

  it('offers no control while the venue is not taking orders', () => {
    const item = dish();
    renderWithProviders(<FoodItemDetails venue={venueWith(item, false)} item={item} />);

    expect(screen.queryByTestId('food-item-details-chai-add')).toBeNull();
    expect(screen.queryByTestId('food-item-details-unavailable')).toBeNull();
  });

  it('warns when the order already holds the most different dishes', () => {
    cart(0, { atMaxLines: true });
    const item = dish();
    renderWithProviders(<FoodItemDetails venue={venueWith(item)} item={item} />);

    expect(
      screen.getByText(/^One order can hold at most \d+ different dishes\.$/),
    ).toBeOnTheScreen();
  });
});
