import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FoodItemPrice from '../FoodItemPrice';

type Item = Parameters<typeof FoodItemPrice>[0]['item'];

const renderPrice = (over: Partial<Item> = {}) =>
  render(<FoodItemPrice item={{ id: 'chai', price: 40, original_price: null, saving_display: null, ...over }} currency="₹" />);

describe('FoodItemPrice', () => {
  it('shows just the price when the owner set no original price', () => {
    renderPrice();
    expect(screen.getByTestId('food-item-price-chai')).toHaveTextContent('₹40');
    expect(screen.queryByTestId('food-item-original-price-chai')).not.toBeInTheDocument();
    expect(screen.queryByTestId('food-item-saving-chai')).not.toBeInTheDocument();
  });

  it('strikes the original price through and names the saving as a percent by default', () => {
    renderPrice({ original_price: 50 });
    expect(screen.getByTestId('food-item-price-chai')).toHaveTextContent('₹40');
    const original = screen.getByTestId('food-item-original-price-chai');
    expect(original.tagName).toBe('S');
    expect(original).toHaveTextContent('₹50');
    // A screen reader hears what the struck number is, not a bare amount.
    expect(original).toHaveAttribute('aria-label', 'Original price ₹50');
    expect(screen.getByTestId('food-item-saving-chai')).toHaveTextContent('20% off');
  });

  it('names the saving as an amount when the owner chose AMOUNT', () => {
    renderPrice({ original_price: 50, saving_display: 'AMOUNT' });
    expect(screen.getByTestId('food-item-saving-chai')).toHaveTextContent('₹10 off');
  });

  it('rounds a percent down, and reads a saving under 1% as the amount', () => {
    const { unmount } = renderPrice({ price: 67, original_price: 100 });
    // 33% saved exactly — never rounded up to promise more.
    expect(screen.getByTestId('food-item-saving-chai')).toHaveTextContent('33% off');
    unmount();
    renderPrice({ price: 995, original_price: 1000 });
    expect(screen.getByTestId('food-item-saving-chai')).toHaveTextContent('₹5 off');
  });

  it('strikes nothing when the original is not above the price', () => {
    const { unmount } = renderPrice({ original_price: 40 });
    expect(screen.queryByTestId('food-item-original-price-chai')).not.toBeInTheDocument();
    unmount();
    renderPrice({ original_price: 30 });
    expect(screen.queryByTestId('food-item-original-price-chai')).not.toBeInTheDocument();
    expect(screen.queryByTestId('food-item-saving-chai')).not.toBeInTheDocument();
  });

  it('prices in the venue’s currency', () => {
    render(<FoodItemPrice item={{ id: 'chai', price: 40, original_price: 50 }} currency="$" />);
    expect(screen.getByTestId('food-item-price-chai')).toHaveTextContent('$40');
    expect(screen.getByTestId('food-item-original-price-chai')).toHaveTextContent('$50');
  });
});
