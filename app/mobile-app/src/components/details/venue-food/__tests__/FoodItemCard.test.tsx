import { act, fireEvent, screen } from '@testing-library/react-native';
import { CART_CONTROL_NOTICE_MS, FOOD_ORDER_LIMITS, type VenueFoodItem } from '@duncit/utils';

import { FoodItemCard } from '@/components/details/venue-food/FoodItemCard';
import { renderWithProviders } from '@/utils/test-utils';

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

describe('FoodItemCard cart control', () => {
  const card = (quantity: number, over: Partial<VenueFoodItem> = {}, canOrder = true) => (
    <FoodItemCard
      item={dish(over)}
      currency="₹"
      canOrder={canOrder}
      quantity={quantity}
      cartReady
      onQuantity={onQuantity}
    />
  );
  const onQuantity = jest.fn();

  beforeEach(() => {
    onQuantity.mockClear();
  });

  it('adds the dish from the "+", then steps and removes it from the pill', () => {
    const { rerender } = renderWithProviders(card(0));
    expect(screen.queryByTestId('food-item-stepper-chai')).toBeNull();
    fireEvent.press(screen.getByTestId('food-item-add-chai'));
    expect(onQuantity).toHaveBeenLastCalledWith('chai', 1);

    rerender(card(1));
    expect(screen.queryByTestId('food-item-add-chai')).toBeNull();
    expect(screen.getByTestId('food-item-stepper-chai-value')).toHaveTextContent('1');
    fireEvent.press(screen.getByTestId('food-item-stepper-chai-increase'));
    expect(onQuantity).toHaveBeenLastCalledWith('chai', 2);
    fireEvent.press(screen.getByTestId('food-item-stepper-chai-decrease'));
    expect(onQuantity).toHaveBeenLastCalledWith('chai', 0);
  });

  it('stops at the most of one dish an order may hold', () => {
    renderWithProviders(card(FOOD_ORDER_LIMITS.maxQuantity));
    const plus = screen.getByTestId('food-item-stepper-chai-increase');
    expect(plus.props['aria-disabled']).toBe(true);
    fireEvent.press(plus);
    expect(onQuantity).not.toHaveBeenCalled();
  });

  it('has no control for a dish that is off, or a venue not taking orders', () => {
    const { rerender } = renderWithProviders(card(0, { is_available: false }));
    expect(screen.queryByTestId('food-item-add-chai')).toBeNull();
    rerender(card(0, {}, false));
    expect(screen.queryByTestId('food-item-add-chai')).toBeNull();
  });

  it('says "Item added" then "Item removed" over the photo, each for a moment', () => {
    jest.useFakeTimers();
    try {
      const { rerender } = renderWithProviders(card(0));
      expect(screen.queryByTestId('food-item-notice-chai')).toBeNull();

      rerender(card(1));
      expect(screen.getByTestId('food-item-notice-chai')).toHaveTextContent('Item added');
      // A second unit is not news.
      rerender(card(2));
      act(() => {
        jest.advanceTimersByTime(CART_CONTROL_NOTICE_MS);
      });
      expect(screen.queryByTestId('food-item-notice-chai')).toBeNull();

      rerender(card(0));
      expect(screen.getByTestId('food-item-notice-chai')).toHaveTextContent('Item removed');
      act(() => {
        jest.advanceTimersByTime(CART_CONTROL_NOTICE_MS);
      });
      expect(screen.queryByTestId('food-item-notice-chai')).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });
});
