import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { VenueFoodItem } from '@duncit/utils';
import FoodItemCard from '../FoodItemCard';

const dish = (over: Partial<VenueFoodItem> = {}): VenueFoodItem => ({
  id: 'paneer',
  name: 'Paneer Tikka',
  description: 'Char-grilled cottage cheese',
  category: 'Starters',
  price: 220,
  images: [],
  diet: 'VEG',
  spice_level: 'MEDIUM',
  is_available: true,
  ...over,
});

const renderCard = (item: VenueFoodItem, props: { detailsPath?: string; canOrder?: boolean; quantity?: number } = {}) => {
  const onQuantity = vi.fn<(itemId: string, quantity: number) => void>();
  render(
    <MemoryRouter>
      <ul>
        <FoodItemCard
          item={item}
          currency="₹"
          canOrder={props.canOrder ?? true}
          quantity={props.quantity ?? 0}
          onQuantity={onQuantity}
          detailsPath={props.detailsPath}
        />
      </ul>
    </MemoryRouter>,
  );
  return { onQuantity };
};

describe('FoodItemCard', () => {
  it('shows only the first photo, as a picture rather than a control of its own', () => {
    renderCard(dish({ images: ['https://img/paneer-1.jpg', 'https://img/paneer-2.jpg'] }), { detailsPath: '/venues/v1/food/paneer' });

    const thumb = screen.getByTestId('food-item-image-paneer');
    expect(within(thumb).getByRole('img', { name: 'Paneer Tikka' })).toHaveAttribute('src', 'https://img/paneer-1.jpg');
    expect(screen.queryByRole('button', { name: /View the photo/ })).not.toBeInTheDocument();
    // The card's one link is the dish name, stretched over the photo too.
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('shows a plain mark, not a button, for a dish with no photo', () => {
    renderCard(dish());
    expect(screen.queryByTestId('food-item-image-paneer')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /View the photo/ })).not.toBeInTheDocument();
  });

  it('links the name to the dish’s own page when there is one', () => {
    renderCard(dish(), { detailsPath: '/venues/v1/food/paneer' });
    const link = screen.getByRole('link', { name: 'Paneer Tikka' });
    expect(link).toBe(screen.getByTestId('food-item-open-paneer'));
    expect(link).toHaveAttribute('href', '/venues/v1/food/paneer');
  });

  it('prints the name as plain text when the dish has no page to open', () => {
    renderCard(dish());
    expect(screen.getByRole('heading', { level: 4, name: 'Paneer Tikka' })).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Char-grilled cottage cheese')).toBeInTheDocument();
  });

  it('sends the new quantity with the dish id from the cart control', () => {
    const { onQuantity } = renderCard(dish());
    fireEvent.click(screen.getByRole('button', { name: 'Add Paneer Tikka' }));
    expect(onQuantity).toHaveBeenCalledWith('paneer', 1);
  });

  it('labels a dish that is off for now and offers no way to add it', () => {
    renderCard(dish({ is_available: false, description: '' }));
    expect(screen.getByTestId('food-item-unavailable-paneer')).toHaveTextContent('Unavailable');
    expect(screen.queryByRole('button', { name: 'Add Paneer Tikka' })).not.toBeInTheDocument();
    expect(screen.queryByText('Char-grilled cottage cheese')).not.toBeInTheDocument();
  });
});
